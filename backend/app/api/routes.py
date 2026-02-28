from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict
from app.services.rag_service import RAGService
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)
rag_service = RAGService()

class ChatRequest(BaseModel):
    doc_id: str
    question: str
    history: List[Dict[str, str]] = []

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        doc_id = await rag_service.process_pdf(file)
        return {"doc_id": doc_id, "message": "Document uploaded and processed successfully."}
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ask")
async def ask_question(request: ChatRequest):
    try:
        response = rag_service.ask_question(request.doc_id, request.question, request.history)
        return response
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Q&A failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate answer.")

@router.get("/summary/{doc_id}")
async def get_summary(doc_id: str):
    try:
        summary = rag_service.generate_summary(doc_id)
        return {"summary": summary}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Summarization failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate summary.")

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    try:
        rag_service.delete_document(doc_id)
        return {"message": "Document deleted successfully."}
    except Exception as e:
        logger.error(f"Deletion failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete document.")