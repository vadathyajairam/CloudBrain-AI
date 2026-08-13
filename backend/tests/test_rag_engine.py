import os
import unittest

os.environ["DATABASE_URL"] = "sqlite:///./test_synexis_rag.db"

from backend.app.database import engine
from backend.app.database.models import Base
from backend.app.core.rag_engine import RAGEngine, BUILTIN_RUNBOOKS, DenseVectorizer

class TestRAGEngine(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.rag = RAGEngine()
        self.rag.initialize()

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)

    def test_dense_vectorizer_embeddings(self):
        # Test dense vector embedding computation & normalization
        text_a = "PostgreSQL database connection pool exhausted operational error"
        vec_a = DenseVectorizer.compute_dense_embedding(text_a)
        self.assertEqual(len(vec_a), DenseVectorizer.DIMENSION)

        # L2 norm should be 1.0 (or close within floating point precision)
        norm_a = sum(x * x for x in vec_a)
        self.assertAlmostEqual(norm_a, 1.0, places=3)

        # Cosine similarity of identical text should be ~1.0
        vec_a_dup = DenseVectorizer.compute_dense_embedding(text_a)
        sim_self = DenseVectorizer.cosine_similarity(vec_a, vec_a_dup)
        self.assertAlmostEqual(sim_self, 1.0, places=3)

        # Cosine similarity of semantically related text should be positive
        text_b = "Database connection refused postgres crash"
        vec_b = DenseVectorizer.compute_dense_embedding(text_b)
        sim_related = DenseVectorizer.cosine_similarity(vec_a, vec_b)
        self.assertGreater(sim_related, 0.2)

    def test_builtin_runbooks_present(self):
        docs = self.rag.list_documents()
        self.assertGreaterEqual(len(docs), len(BUILTIN_RUNBOOKS))
        titles = [d["title"] for d in docs]
        self.assertTrue(any("PostgreSQL" in t for t in titles))
        self.assertTrue(any("CPU" in t for t in titles))
        self.assertTrue(any("OOMKilled" in t or "Memory" in t for t in titles))

    def test_vector_retrieval_postgres(self):
        results = self.rag.retrieve("OperationalError could not connect to postgres database connection refused", top_k=2)
        self.assertGreater(len(results), 0)
        top = results[0]
        self.assertIn("PostgreSQL", top["title"])
        self.assertGreater(top["score"], 0.2)
        self.assertIn("vector_similarity", top)
        self.assertGreater(top["vector_similarity"], 0.1)

    def test_vector_retrieval_cpu_spin(self):
        results = self.rag.retrieve("High CPU utilization spin loop retry storm", top_k=2)
        self.assertGreater(len(results), 0)
        top = results[0]
        self.assertIn("CPU", top["title"])
        self.assertGreater(top["vector_similarity"], 0.1)

    def test_vector_retrieval_oom_memory(self):
        results = self.rag.retrieve("Container exit code 137 memory leak SIGKILL", top_k=2)
        self.assertGreater(len(results), 0)
        top = results[0]
        self.assertTrue("Memory" in top["title"] or "OOM" in top["title"])
        self.assertGreater(top["vector_similarity"], 0.1)

    def test_index_resolved_incident_vector_learning(self):
        incident_sample = {
            "id": "INC-TEST-999",
            "title": "Database Connection Spike on Payment Service",
            "service": "synexis-postgres",
            "rule_id": "error_burst",
            "root_cause": "Exhausted connection pool handles during traffic surge.",
            "action_type": "restart_container",
            "evidence_summary": "45 errors in 30s log buffer.",
        }
        res = self.rag.index_incident(incident_sample)
        self.assertEqual(res["status"], "INDEXED")
        self.assertEqual(res["category"], "IncidentLesson")

        # Query vector store for the new incident lesson
        retrieved = self.rag.retrieve("payment service connection pool surge INC-TEST-999", top_k=3)
        self.assertTrue(any("INC-TEST-999" in r["document_id"] or "Payment Service" in r["title"] for r in retrieved))
        top_match = [r for r in retrieved if "INC-TEST-999" in r["document_id"]][0]
        self.assertGreater(top_match["vector_similarity"], 0.1)

    def test_rag_stats(self):
        stats = self.rag.get_stats()
        self.assertEqual(stats["status"], "ready")
        self.assertEqual(stats["vector_dimension"], 128)
        self.assertGreaterEqual(stats["total_documents"], 6)
        self.assertGreaterEqual(stats["total_chunks"], 6)

if __name__ == "__main__":
    unittest.main()
