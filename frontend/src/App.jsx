import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

function App() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [datasets, setDatasets] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [cleanResult, setCleanResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const response = await fetch(`${API}/api/datasets/`);
      const data = await response.json();
      setDatasets(data);
    } catch (error) {
      setMessage("Failed to load datasets");
    }
  };

  const uploadDataset = async () => {
    if (!file) {
      setMessage("Please select a CSV file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${API}/api/datasets/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Upload failed");
        return;
      }

      setMessage("Dataset uploaded successfully");
      setFile(null);
      await loadDatasets();
    } catch (error) {
      setMessage("Backend connection failed");
    } finally {
      setLoading(false);
    }
  };

  const analyzeDataset = async (datasetId) => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API}/api/datasets/analyze/${datasetId}`
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Analysis failed");
        return;
      }

      setAnalysis(data);
      setMessage("Analysis completed successfully");
    } catch (error) {
      setMessage("Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const cleanDataset = async (datasetId) => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API}/api/datasets/clean/${datasetId}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Cleaning failed");
        return;
      }

      setCleanResult(data);
      setMessage("Dataset cleaned successfully");
    } catch (error) {
      setMessage("Cleaning failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadCleaned = (datasetId) => {
    window.open(
      `${API}/api/datasets/download-cleaned/${datasetId}`,
      "_blank"
    );
  };

  const visualizeDataset = async (datasetId) => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API}/api/datasets/visualize/${datasetId}?chart_type=bar&x_column=City&y_column=Salary`
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Visualization failed");
        return;
      }

      setMessage("Visualization created successfully");

      window.open(`${API}${data.chart_url}`, "_blank");
    } catch (error) {
      setMessage("Visualization failed");
    } finally {
      setLoading(false);
    }
  };

  const getId = (dataset) => dataset.id || dataset.dataset_id;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.logo}>DataLens</h1>
            <p style={styles.subtitle}>
              Smart Dataset Cleaning, Analysis & Visualization
            </p>
          </div>

          <div style={styles.status}>
            <span style={styles.statusDot}></span>
            Backend Connected
          </div>
        </header>

        {/* MESSAGE */}
        {message && (
          <div
            style={{
              ...styles.message,
              background:
                message.toLowerCase().includes("failed") ||
                message.toLowerCase().includes("please")
                  ? "#fee2e2"
                  : "#dcfce7",
              color:
                message.toLowerCase().includes("failed") ||
                message.toLowerCase().includes("please")
                  ? "#991b1b"
                  : "#166534",
            }}
          >
            {message}
          </div>
        )}

        {/* UPLOAD SECTION */}
        <section style={styles.uploadCard}>
          <div>
            <h2 style={styles.sectionTitle}>Upload Dataset</h2>
            <p style={styles.sectionText}>
              Upload your CSV file to start data analysis.
            </p>
          </div>

          <div style={styles.uploadArea}>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0])}
              style={styles.fileInput}
            />

            {file && (
              <p style={styles.fileName}>
                Selected: <b>{file.name}</b>
              </p>
            )}

            <button
              onClick={uploadDataset}
              disabled={loading}
              style={styles.primaryButton}
            >
              {loading ? "Processing..." : "Upload Dataset"}
            </button>
          </div>
        </section>

        {/* DATASETS */}
        <section>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Datasets</h2>
              <p style={styles.sectionText}>
                Manage and analyze your uploaded datasets.
              </p>
            </div>

            <div style={styles.datasetCount}>
              {datasets.length} Dataset{datasets.length !== 1 ? "s" : ""}
            </div>
          </div>

          {datasets.length === 0 ? (
            <div style={styles.emptyCard}>
              <h3>No datasets found</h3>
              <p>Upload a CSV dataset to get started.</p>
            </div>
          ) : (
            datasets.map((dataset) => {
              const id = getId(dataset);

              return (
                <div key={id} style={styles.datasetCard}>

                  <div style={styles.datasetTop}>
                    <div>
                      <h3 style={styles.datasetName}>
                        {dataset.filename}
                      </h3>

                      <p style={styles.datasetInfo}>
                        Dataset ID: <b>{id}</b>
                      </p>

                      {dataset.uploaded_at && (
                        <p style={styles.datasetInfo}>
                          Uploaded: {dataset.uploaded_at}
                        </p>
                      )}
                    </div>

                    <div style={styles.csvBadge}>CSV</div>
                  </div>

                  <div style={styles.buttonRow}>
                    <button
                      onClick={() => analyzeDataset(id)}
                      disabled={loading}
                      style={styles.actionButton}
                    >
                      Analyze
                    </button>

                    <button
                      onClick={() => cleanDataset(id)}
                      disabled={loading}
                      style={styles.actionButton}
                    >
                      Clean
                    </button>

                    <button
                      onClick={() => visualizeDataset(id)}
                      disabled={loading}
                      style={styles.actionButton}
                    >
                      Visualize
                    </button>

                    <button
                      onClick={() => downloadCleaned(id)}
                      style={styles.downloadButton}
                    >
                      Download Cleaned
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* ANALYSIS RESULT */}
        {analysis && (
          <section style={styles.resultSection}>
            <h2 style={styles.sectionTitle}>Dataset Analysis</h2>

            <div style={styles.statsGrid}>

              <div style={styles.statCard}>
                <span style={styles.statLabel}>Rows</span>
                <strong style={styles.statValue}>
                  {analysis.rows}
                </strong>
              </div>

              <div style={styles.statCard}>
                <span style={styles.statLabel}>Columns</span>
                <strong style={styles.statValue}>
                  {analysis.columns}
                </strong>
              </div>

              <div style={styles.statCard}>
                <span style={styles.statLabel}>Missing Values</span>
                <strong style={styles.statValue}>
                  {analysis.missing_values}
                </strong>
              </div>

              <div style={styles.statCard}>
                <span style={styles.statLabel}>Duplicate Rows</span>
                <strong style={styles.statValue}>
                  {analysis.duplicate_rows}
                </strong>
              </div>

            </div>

            <div style={styles.columnsCard}>
              <h3 style={styles.subTitle}>Columns Information</h3>

              {analysis.columns_info?.map((column) => (
                <div key={column.name} style={styles.columnRow}>
                  <div>
                    <b>{column.name}</b>
                    <span style={styles.typeBadge}>
                      {column.data_type}
                    </span>
                  </div>

                  <div style={styles.columnDetails}>
                    Missing: {column.missing_values} | Unique:{" "}
                    {column.unique_values}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CLEANING RESULT */}
        {cleanResult && (
          <section style={styles.resultSection}>
            <h2 style={styles.sectionTitle}>Cleaning Result</h2>

            <div style={styles.statsGrid}>

              <div style={styles.cleanCard}>
                <span style={styles.statLabel}>Original Rows</span>
                <strong style={styles.statValue}>
                  {cleanResult.original_rows}
                </strong>
              </div>

              <div style={styles.cleanCard}>
                <span style={styles.statLabel}>Cleaned Rows</span>
                <strong style={styles.statValue}>
                  {cleanResult.cleaned_rows}
                </strong>
              </div>

              <div style={styles.cleanCard}>
                <span style={styles.statLabel}>Missing Values</span>
                <strong style={styles.statValue}>
                  {cleanResult.original_missing_values} →{" "}
                  {cleanResult.cleaned_missing_values}
                </strong>
              </div>

              <div style={styles.cleanCard}>
                <span style={styles.statLabel}>Duplicate Rows</span>
                <strong style={styles.statValue}>
                  {cleanResult.original_duplicate_rows} →{" "}
                  {cleanResult.cleaned_duplicate_rows}
                </strong>
              </div>

            </div>

            <div style={styles.successBox}>
              Dataset cleaning completed successfully.
            </div>
          </section>
        )}

        {/* FOOTER */}
        <footer style={styles.footer}>
          <b>DataLens</b> — Dataset Analysis & Visualization Platform
        </footer>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    fontFamily: "Arial, sans-serif",
    color: "#1f2937",
  },

  container: {
    maxWidth: "1150px",
    margin: "auto",
    padding: "30px 20px",
  },

  header: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "25px 30px",
    marginBottom: "25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
  },

  logo: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "700",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#6b7280",
  },

  status: {
    padding: "9px 14px",
    borderRadius: "20px",
    background: "#ecfdf5",
    color: "#166534",
    fontSize: "14px",
    fontWeight: "600",
  },

  statusDot: {
    display: "inline-block",
    width: "8px",
    height: "8px",
    background: "#22c55e",
    borderRadius: "50%",
    marginRight: "7px",
  },

  message: {
    padding: "13px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontWeight: "600",
  },

  uploadCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "25px",
    marginBottom: "30px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "24px",
  },

  sectionText: {
    color: "#6b7280",
    marginTop: "7px",
  },

  uploadArea: {
    marginTop: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
  },

  fileInput: {
    padding: "10px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#f9fafb",
  },

  fileName: {
    color: "#374151",
  },

  primaryButton: {
    border: "none",
    borderRadius: "8px",
    padding: "11px 20px",
    background: "#111827",
    color: "#ffffff",
    fontWeight: "600",
    cursor: "pointer",
  },

  datasetCount: {
    background: "#e5e7eb",
    padding: "8px 13px",
    borderRadius: "20px",
    fontSize: "14px",
    fontWeight: "600",
  },

  datasetCard: {
    background: "#ffffff",
    borderRadius: "15px",
    padding: "22px",
    marginBottom: "18px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
  },

  datasetTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  datasetName: {
    margin: 0,
    fontSize: "20px",
  },

  datasetInfo: {
    margin: "7px 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  csvBadge: {
    background: "#e0f2fe",
    color: "#0369a1",
    padding: "7px 12px",
    borderRadius: "8px",
    fontWeight: "700",
    fontSize: "12px",
  },

  buttonRow: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
    flexWrap: "wrap",
  },

  actionButton: {
    padding: "9px 16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#ffffff",
    cursor: "pointer",
    fontWeight: "600",
  },

  downloadButton: {
    padding: "9px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "600",
  },

  emptyCard: {
    background: "#ffffff",
    borderRadius: "15px",
    padding: "40px",
    textAlign: "center",
    color: "#6b7280",
  },

  resultSection: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "25px",
    marginTop: "30px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
    marginTop: "20px",
  },

  statCard: {
    padding: "20px",
    borderRadius: "12px",
    background: "#f3f4f6",
  },

  cleanCard: {
    padding: "20px",
    borderRadius: "12px",
    background: "#ecfdf5",
  },

  statLabel: {
    display: "block",
    color: "#6b7280",
    fontSize: "14px",
    marginBottom: "8px",
  },

  statValue: {
    fontSize: "25px",
  },

  columnsCard: {
    marginTop: "25px",
  },

  subTitle: {
    marginBottom: "10px",
  },

  columnRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    padding: "13px 0",
    borderBottom: "1px solid #e5e7eb",
    flexWrap: "wrap",
  },

  typeBadge: {
    marginLeft: "10px",
    background: "#f3f4f6",
    padding: "4px 8px",
    borderRadius: "5px",
    fontSize: "12px",
  },

  columnDetails: {
    color: "#6b7280",
    fontSize: "14px",
  },

  successBox: {
    marginTop: "20px",
    padding: "13px",
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "8px",
    fontWeight: "600",
  },

  footer: {
    textAlign: "center",
    padding: "30px 0 10px",
    color: "#6b7280",
    fontSize: "14px",
  },
};

export default App;