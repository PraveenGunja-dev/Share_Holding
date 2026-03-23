import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import List, Optional


class PdfConversionError(Exception):
    pass


try:
    import win32com.client  # type: ignore
    HAS_WIN32 = True
except Exception:
    HAS_WIN32 = False


def _write_temp_pptx(pptx_bytes: bytes, work_dir: str) -> str:
    pptx_path = os.path.join(work_dir, "report.pptx")
    with open(pptx_path, "wb") as f:
        f.write(pptx_bytes)
    return pptx_path


def _find_soffice() -> Optional[str]:
    env_path = os.environ.get("SOFFICE_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path

    candidates = [
        shutil.which("soffice"),
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            return path
    return None


def _convert_with_powerpoint(pptx_path: str, out_pdf_path: str) -> bytes:
    if not HAS_WIN32:
        raise PdfConversionError("pywin32 is not installed")

    powerpoint = None
    presentation = None
    try:
        powerpoint = win32com.client.DispatchEx("PowerPoint.Application")
        presentation = powerpoint.Presentations.Open(pptx_path, WithWindow=False)
        presentation.SaveAs(out_pdf_path, 32)  # 32 = PDF
        presentation.Close()
        presentation = None
        powerpoint.Quit()
        powerpoint = None

        if not os.path.exists(out_pdf_path) or os.path.getsize(out_pdf_path) == 0:
            raise PdfConversionError("PowerPoint conversion created empty PDF")

        with open(out_pdf_path, "rb") as f:
            return f.read()
    except Exception as e:
        raise PdfConversionError(f"PowerPoint COM conversion failed: {e}") from e
    finally:
        try:
            if presentation is not None:
                presentation.Close()
        except Exception:
            pass
        try:
            if powerpoint is not None:
                powerpoint.Quit()
        except Exception:
            pass


def _convert_with_libreoffice(pptx_path: str, out_dir: str) -> bytes:
    soffice = _find_soffice()
    if not soffice:
        raise PdfConversionError("LibreOffice (soffice) not found")

    cmd = [
        soffice,
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        out_dir,
        pptx_path,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except Exception as e:
        raise PdfConversionError(f"LibreOffice conversion failed: {e}") from e

    pdf_path = os.path.join(out_dir, f"{Path(pptx_path).stem}.pdf")
    if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) == 0:
        raise PdfConversionError("LibreOffice conversion produced no PDF")

    with open(pdf_path, "rb") as f:
        return f.read()


def pptx_bytes_to_pdf(pptx_bytes: bytes) -> bytes:
    if not pptx_bytes:
        raise PdfConversionError("No PPTX content provided")

    with tempfile.TemporaryDirectory() as tmp_dir:
        pptx_path = _write_temp_pptx(pptx_bytes, tmp_dir)
        out_pdf_path = os.path.join(tmp_dir, "report.pdf")

        # Prefer native PowerPoint on Windows when available, then fallback.
        if HAS_WIN32:
            try:
                return _convert_with_powerpoint(pptx_path, out_pdf_path)
            except PdfConversionError:
                pass

        return _convert_with_libreoffice(pptx_path, tmp_dir)


def pptx_to_images(pptx_bytes: bytes) -> List[bytes]:
    """
    Convert PPTX slides to PNG bytes using PowerPoint COM.
    Returns [] when preview rendering is unavailable on server.
    """
    if not pptx_bytes:
        return []
    if not HAS_WIN32:
        return []

    with tempfile.TemporaryDirectory() as tmp_dir:
        pptx_path = _write_temp_pptx(pptx_bytes, tmp_dir)
        powerpoint = None
        presentation = None
        try:
            powerpoint = win32com.client.DispatchEx("PowerPoint.Application")
            presentation = powerpoint.Presentations.Open(pptx_path, WithWindow=False)
            presentation.SaveAs(tmp_dir, 17)  # 17 = ppSaveAsPNG
            presentation.Close()
            presentation = None
            powerpoint.Quit()
            powerpoint = None

            images: List[bytes] = []
            for image_path in sorted(Path(tmp_dir).glob("Slide*.PNG")):
                images.append(image_path.read_bytes())
            return images
        except Exception:
            return []
        finally:
            try:
                if presentation is not None:
                    presentation.Close()
            except Exception:
                pass
            try:
                if powerpoint is not None:
                    powerpoint.Quit()
            except Exception:
                pass
 
