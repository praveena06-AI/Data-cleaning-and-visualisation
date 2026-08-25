const API_URL = "http://127.0.0.1:8000";

async function uploadDataset() {
    const fileInput = document.getElementById("fileInput");
    const message = document.getElementById("uploadMessage");

    if (!fileInput.files.length) {
        message.textContent = "Please select a CSV file first.";
        return;
    }

    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append("file", file);

    message.textContent = "Uploading...";

    try {
        const response = await fetch(`${API_URL}/api/datasets/upload`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            message.textContent = "Dataset uploaded successfully";
            loadDatasets();
        } else {
            message.textContent =
                "Upload failed: " + (data.detail || "Unknown error");
        }

    } catch (error) {
        console.error("Upload error:", error);
        message.textContent = "Cannot connect to backend.";
    }
}


async function loadDatasets() {
    const datasetList = document.getElementById("datasetList");

    try {
        // Notice the / at the end
        const response = await fetch(`${API_URL}/api/datasets/`);

        if (!response.ok) {
            datasetList.textContent = "Unable to load datasets.";
            return;
        }

        const data = await response.json();

        console.log("Datasets response:", data);

        // Handle different possible response formats
        const datasets = Array.isArray(data)
            ? data
            : data.datasets || data.data || [];

        if (datasets.length === 0) {
            datasetList.textContent = "No datasets found.";
            return;
        }

        datasetList.innerHTML = "";

        datasets.forEach(dataset => {
            const card = document.createElement("div");
            card.className = "dataset-card";

            card.innerHTML = `
                <h3>${dataset.filename || dataset.name || "Dataset"}</h3>
                <p>Dataset ID: ${dataset.id || dataset.dataset_id || "N/A"}</p>
            `;

            datasetList.appendChild(card);
        });

    } catch (error) {
        console.error("Dataset loading error:", error);
        datasetList.textContent = "Cannot connect to backend.";
    }
}


window.onload = function () {
    loadDatasets();
};