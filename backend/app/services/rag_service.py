import os
import uuid
from typing import List, Dict, Any
from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain.chains.summarize import load_summarize_chain
from app.utils.logger import get_logger
import tempfile

# --- HYBRID IMPORTS ---
from langchain_openai import ChatOpenAI # For OpenRouter
from langchain_google_genai import GoogleGenerativeAIEmbeddings # For reading the PDF

logger = get_logger(__name__)

# In-memory store for vector databases
vector_stores: Dict[str, FAISS] = {}
raw_documents_store: Dict[str, List] = {}

# Set your OpenRouter key explicitly so we don't have to worry about the .env file
os.environ["OPENROUTER_API_KEY"] = "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"

class RAGService:
    def __init__(self):
        # 1. THE BRAIN: Using OpenRouter with Meta's free LLaMA 3 model to bypass Google's errors!
        # THE BRAIN: Using Mistral 7B (Highly stable free model on OpenRouter)
        # THE BRAIN: Using OpenRouter's auto-router to bypass ALL future 404 errors!
        self.llm = ChatOpenAI(
            openai_api_key="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", 
            openai_api_base="https://openrouter.ai/api/v1",
            model_name="openrouter/free", # <-- THE MAGIC STRING
            temperature=0
        )
        
        # 2. THE EYES: Gemini Embeddings (Your logs show this works perfectly!)
        self.embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )

    async def process_pdf(self, file: UploadFile) -> str:
        doc_id = str(uuid.uuid4())
        logger.info(f"Processing PDF. Generated Doc ID: {doc_id}")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        try:
            loader = PyPDFLoader(tmp_path)
            docs = loader.load()
            chunks = self.text_splitter.split_documents(docs)
            
            if not chunks:
                raise ValueError("No extractable text found. The PDF might be a scanned image.")
            
            vectorstore = FAISS.from_documents(chunks, self.embeddings)
            vector_stores[doc_id] = vectorstore
            raw_documents_store[doc_id] = docs 
            
            logger.info(f"Successfully processed {len(chunks)} chunks for {doc_id}")
            return doc_id
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            raise e
        finally:
            os.remove(tmp_path)

    def ask_question(self, doc_id: str, question: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        if doc_id not in vector_stores:
            raise ValueError("Document not found. Please upload it again.")

        vectorstore = vector_stores[doc_id]
        retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

        chat_history = []
        for msg in history:
            if msg["role"] == "user":
                chat_history.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                chat_history.append(AIMessage(content=msg["content"]))

        qa_system_prompt = (
            "You are an assistant for question-answering tasks. "
            "Use the following pieces of retrieved context to answer the question. "
            "If you don't know the answer, just say that you don't know. "
            "Keep the answer concise and academic.\n\n"
            "{context}"
        )
        
        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", qa_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])

        question_answer_chain = create_stuff_documents_chain(self.llm, qa_prompt)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)

        response = rag_chain.invoke({"input": question, "chat_history": chat_history})
        
        sources = [
            {"page": doc.metadata.get("page", "Unknown"), "content": doc.page_content}
            for doc in response["context"]
        ]

        return {
            "answer": response["answer"],
            "citations": sources
        }

    def generate_summary(self, doc_id: str) -> str:
        if doc_id not in raw_documents_store:
            raise ValueError("Document not found.")
            
        docs = raw_documents_store[doc_id]
        
        # SENIOR ENGINEER FIX: 
        # Grab only the first 5 chunks (Abstract & Intro). 
        # This prevents OpenRouter rate limits and bypasses the map-reduce bug!
        summary_docs = docs[:5]
        
        # Use "stuff" to send it all in one lightning-fast request
        chain = load_summarize_chain(self.llm, chain_type="stuff")
        
        # Explicitly pass the dict format LangChain expects
        summary = chain.invoke({"input_documents": summary_docs})
        
        return summary["output_text"]

    def delete_document(self, doc_id: str):
        if doc_id in vector_stores:
            del vector_stores[doc_id]
        if doc_id in raw_documents_store:
            del raw_documents_store[doc_id]
        logger.info(f"Deleted document context: {doc_id}")