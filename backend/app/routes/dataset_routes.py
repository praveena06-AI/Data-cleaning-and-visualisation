from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import shutil
import pandas as pd
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt

from app.database.connection import get_db
from app.models.dataset import Dataset


router = APIRouter(
    prefix="/api/datasets",
    tags=["Datasets"]
)

UPLOAD_DIR = "uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)


# =========================================================
# UPLOAD DATASET
# =========================================================

@router.post("/upload")
def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No file selected"
            )

        allowed_extensions = [".csv", ".xlsx", ".xls"]

        extension = os.path.splitext(file.filename)[1].lower()

        if extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail="Only CSV and Excel files are allowed"
            )

        # Check duplicate filename
        existing_dataset = db.query(Dataset).filter(
            Dataset.filename == file.filename
        ).first()

        if existing_dataset:
            raise HTTPException(
                status_code=400,
                detail="This dataset already exists"
            )

        file_path = os.path.join(
            UPLOAD_DIR,
            file.filename
        )

        # Save physical file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(
                file.file,
                buffer
            )

        # Save database record
        dataset = Dataset(
            filename=file.filename,
            file_path=file_path
        )

        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        return {
            "message": "Dataset uploaded successfully",
            "dataset_id": dataset.id,
            "filename": dataset.filename
        }

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# GET ALL DATASETS
# =========================================================

@router.get("/")
def get_datasets(
    db: Session = Depends(get_db)
):
    try:
        datasets = db.query(Dataset).all()

        return datasets

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# DOWNLOAD DATASET
# =========================================================

@router.get("/download/{dataset_id}")
def download_dataset(
    dataset_id: int,
    db: Session = Depends(get_db)
):
    try:
        dataset = db.query(Dataset).filter(
            Dataset.id == dataset_id
        ).first()

        if not dataset:
            raise HTTPException(
                status_code=404,
                detail="Dataset not found"
            )

        if not os.path.exists(dataset.file_path):
            raise HTTPException(
                status_code=404,
                detail="Dataset file not found"
            )

        return FileResponse(
            path=dataset.file_path,
            filename=dataset.filename
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# DELETE ONE DATASET
# =========================================================

@router.delete("/{dataset_id}")
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db)
):
    try:
        dataset = db.query(Dataset).filter(
            Dataset.id == dataset_id
        ).first()

        if not dataset:
            raise HTTPException(
                status_code=404,
                detail="Dataset not found"
            )

        # Correct model field name
        file_path = dataset.file_path

        # Delete database record
        db.delete(dataset)
        db.commit()

        # Check whether another record uses same file
        remaining_dataset = db.query(Dataset).filter(
            Dataset.file_path == file_path
        ).first()

        # Delete physical file only if no other record uses it
        if not remaining_dataset:

            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except PermissionError:
                    pass

        return {
            "message": "Dataset deleted successfully",
            "dataset_id": dataset_id
        }

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# DELETE ALL DATASETS
# =========================================================

@router.delete("/")
def delete_all_datasets(
    db: Session = Depends(get_db)
):
    try:
        datasets = db.query(Dataset).all()

        if not datasets:
            return {
                "message": "No datasets found",
                "deleted_count": 0
            }

        file_paths = set()

        for dataset in datasets:
            if dataset.file_path:
                file_paths.add(dataset.file_path)

        deleted_count = len(datasets)

        # Delete database records
        for dataset in datasets:
            db.delete(dataset)

        db.commit()

        # Delete physical files
        for file_path in file_paths:

            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except PermissionError:
                    pass

        return {
            "message": "All datasets deleted successfully",
            "deleted_count": deleted_count
        }

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    # =========================================================
# ANALYZE DATASET
# =========================================================

@router.get("/analyze/{dataset_id}")
def analyze_dataset(
    dataset_id: int,
    db: Session = Depends(get_db)
):
    try:

        # Find dataset
        dataset = db.query(Dataset).filter(
            Dataset.id == dataset_id
        ).first()

        if not dataset:
            raise HTTPException(
                status_code=404,
                detail="Dataset not found"
            )

        # Check file exists
        if not os.path.exists(dataset.file_path):
            raise HTTPException(
                status_code=404,
                detail="Dataset file not found"
            )

        # Get extension
        extension = os.path.splitext(
            dataset.file_path
        )[1].lower()

        # Read dataset
        if extension == ".csv":

            df = pd.read_csv(
                dataset.file_path
            )

        elif extension in [".xlsx", ".xls"]:

            df = pd.read_excel(
                dataset.file_path
            )

        else:

            raise HTTPException(
                status_code=400,
                detail="Unsupported file type"
            )

        # Basic information
        rows = len(df)

        columns = len(df.columns)

        missing_values = int(
            df.isnull().sum().sum()
        )

        duplicate_rows = int(
            df.duplicated().sum()
        )

        # Column information
        columns_info = []

        for column in df.columns:

            columns_info.append({
                "name": str(column),
                "data_type": str(df[column].dtype),
                "missing_values": int(
                    df[column].isnull().sum()
                ),
                "unique_values": int(
                    df[column].nunique()
                )
            })

        return {
            "dataset_id": dataset.id,
            "filename": dataset.filename,
            "rows": rows,
            "columns": columns,
            "missing_values": missing_values,
            "duplicate_rows": duplicate_rows,
            "columns_info": columns_info
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    # =========================================================
# CLEAN DATASET
# =========================================================

@router.post("/clean/{dataset_id}")
def clean_dataset(
    dataset_id: int,
    db: Session = Depends(get_db)
):
    try:

        # Find dataset
        dataset = db.query(Dataset).filter(
            Dataset.id == dataset_id
        ).first()

        if not dataset:
            raise HTTPException(
                status_code=404,
                detail="Dataset not found"
            )

        # Check file
        if not os.path.exists(dataset.file_path):
            raise HTTPException(
                status_code=404,
                detail="Dataset file not found"
            )

        # Get extension
        extension = os.path.splitext(
            dataset.file_path
        )[1].lower()

        # Read dataset
        if extension == ".csv":

            df = pd.read_csv(
                dataset.file_path
            )

        elif extension in [".xlsx", ".xls"]:

            df = pd.read_excel(
                dataset.file_path
            )

        else:

            raise HTTPException(
                status_code=400,
                detail="Unsupported file type"
            )

        # Original values
        original_rows = len(df)

        original_missing = int(
            df.isnull().sum().sum()
        )

        original_duplicates = int(
            df.duplicated().sum()
        )

        # Remove duplicate rows
        df = df.drop_duplicates()

        # Fill missing values
        for column in df.columns:

            if df[column].isnull().sum() > 0:

                # Numeric column
                if pd.api.types.is_numeric_dtype(
                    df[column]
                ):

                    df[column] = df[column].fillna(
                        df[column].median()
                    )

                # Text column
                else:

                    mode = df[column].mode()

                    if not mode.empty:

                        df[column] = df[column].fillna(
                            mode.iloc[0]
                        )

                    else:

                        df[column] = df[column].fillna(
                            "Unknown"
                        )

        # Save cleaned file
        base_name = os.path.splitext(
            dataset.filename
        )[0]

        cleaned_filename = (
            base_name + "_cleaned.csv"
        )

        cleaned_path = os.path.join(
            UPLOAD_DIR,
            cleaned_filename
        )

        df.to_csv(
            cleaned_path,
            index=False
        )

        # Final values
        final_rows = len(df)

        final_missing = int(
            df.isnull().sum().sum()
        )

        final_duplicates = int(
            df.duplicated().sum()
        )

        return {
            "message": "Dataset cleaned successfully",

            "dataset_id": dataset_id,

            "original_rows": original_rows,

            "original_missing_values": original_missing,

            "original_duplicate_rows": original_duplicates,

            "cleaned_rows": final_rows,

            "cleaned_missing_values": final_missing,

            "cleaned_duplicate_rows": final_duplicates,

            "cleaned_file": cleaned_filename,

            "download_url": (
                f"/api/datasets/download-cleaned/"
                f"{dataset_id}"
            )
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    # =========================================================
# DOWNLOAD CLEANED DATASET
# =========================================================

@router.get("/download-cleaned/{dataset_id}")
def download_cleaned_dataset(
    dataset_id: int,
    db: Session = Depends(get_db)
):
    try:

        dataset = db.query(Dataset).filter(
            Dataset.id == dataset_id
        ).first()

        if not dataset:
            raise HTTPException(
                status_code=404,
                detail="Dataset not found"
            )

        base_name = os.path.splitext(
            dataset.filename
        )[0]

        cleaned_filename = (
            base_name + "_cleaned.csv"
        )

        cleaned_path = os.path.join(
            UPLOAD_DIR,
            cleaned_filename
        )

        if not os.path.exists(cleaned_path):

            raise HTTPException(
                status_code=404,
                detail="Cleaned dataset not found"
            )

        return FileResponse(
            path=cleaned_path,
            filename=cleaned_filename
        )

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    # =========================================================
# GENERATE VISUALIZATION
# =========================================================

@router.get("/visualize/{dataset_id}")
def visualize_dataset(
    dataset_id: int,
    chart_type: str,
    x_column: str,
    y_column: str = None,
    db: Session = Depends(get_db)
):
    try:

        # Find dataset
        dataset = db.query(Dataset).filter(
            Dataset.id == dataset_id
        ).first()

        if not dataset:
            raise HTTPException(
                status_code=404,
                detail="Dataset not found"
            )

        # Check file
        if not os.path.exists(dataset.file_path):
            raise HTTPException(
                status_code=404,
                detail="Dataset file not found"
            )

        # Read dataset
        extension = os.path.splitext(
            dataset.file_path
        )[1].lower()

        if extension == ".csv":

            df = pd.read_csv(
                dataset.file_path
            )

        elif extension in [".xlsx", ".xls"]:

            df = pd.read_excel(
                dataset.file_path
            )

        else:

            raise HTTPException(
                status_code=400,
                detail="Unsupported file type"
            )

        # Check X column
        if x_column not in df.columns:

            raise HTTPException(
                status_code=400,
                detail=f"Column '{x_column}' not found"
            )

        # Check Y column
        if y_column and y_column not in df.columns:

            raise HTTPException(
                status_code=400,
                detail=f"Column '{y_column}' not found"
            )

        # Create visualization folder
        visualization_dir = "visualizations"

        os.makedirs(
            visualization_dir,
            exist_ok=True
        )

        # File name
        chart_filename = (
            f"dataset_{dataset_id}_"
            f"{chart_type}.png"
        )

        chart_path = os.path.join(
            visualization_dir,
            chart_filename
        )

        # Create figure
        plt.figure(
            figsize=(10, 6)
        )

        # =================================================
        # BAR CHART
        # =================================================

        if chart_type.lower() == "bar":

            if not y_column:

                raise HTTPException(
                    status_code=400,
                    detail="Y column is required for bar chart"
                )

            grouped_data = df.groupby(
                x_column
            )[y_column].sum()

            grouped_data.plot(
                kind="bar"
            )

            plt.xlabel(x_column)

            plt.ylabel(y_column)

            plt.title(
                f"Bar Chart - {x_column} vs {y_column}"
            )

        # =================================================
        # LINE CHART
        # =================================================

        elif chart_type.lower() == "line":

            if not y_column:

                raise HTTPException(
                    status_code=400,
                    detail="Y column is required for line chart"
                )

            plt.plot(
                df[x_column],
                df[y_column]
            )

            plt.xlabel(x_column)

            plt.ylabel(y_column)

            plt.title(
                f"Line Chart - {x_column} vs {y_column}"
            )

        # =================================================
        # PIE CHART
        # =================================================

        elif chart_type.lower() == "pie":

            values = df[x_column].value_counts()

            plt.pie(
                values.values,
                labels=values.index,
                autopct="%1.1f%%"
            )

            plt.title(
                f"Pie Chart - {x_column}"
            )

        # =================================================
        # HISTOGRAM
        # =================================================

        elif chart_type.lower() == "histogram":

            plt.hist(
                df[x_column].dropna(),
                bins=10
            )

            plt.xlabel(x_column)

            plt.ylabel("Frequency")

            plt.title(
                f"Histogram - {x_column}"
            )

        # =================================================
        # SCATTER CHART
        # =================================================

        elif chart_type.lower() == "scatter":

            if not y_column:

                raise HTTPException(
                    status_code=400,
                    detail="Y column is required for scatter chart"
                )

            plt.scatter(
                df[x_column],
                df[y_column]
            )

            plt.xlabel(x_column)

            plt.ylabel(y_column)

            plt.title(
                f"Scatter Plot - {x_column} vs {y_column}"
            )

        else:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid chart type. "
                    "Use bar, line, pie, histogram or scatter"
                )
            )

        plt.xticks(
            rotation=45
        )

        plt.tight_layout()

        # Save chart
        plt.savefig(
            chart_path,
            dpi=150
        )

        plt.close()

        return {
            "message": "Visualization created successfully",
            "dataset_id": dataset_id,
            "chart_type": chart_type,
            "x_column": x_column,
            "y_column": y_column,
            "chart_file": chart_filename,
            "chart_url": (
                f"/api/datasets/"
                f"visualization/{dataset_id}/"
                f"{chart_filename}"
            )
        }

    except HTTPException:
        raise

    except Exception as e:

        plt.close()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# DOWNLOAD VISUALIZATION
# =========================================================

@router.get(
    "/visualization/{dataset_id}/{filename}"
)
def download_visualization(
    dataset_id: int,
    filename: str
):

    visualization_dir = "visualizations"

    file_path = os.path.join(
        visualization_dir,
        filename
    )

    if not os.path.exists(file_path):

        raise HTTPException(
            status_code=404,
            detail="Visualization not found"
        )

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="image/png"
    )