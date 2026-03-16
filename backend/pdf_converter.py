import os
import tempfile
import time
import shutil
try:
    import win32com.client
    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False

class PdfConversionError(Exception):
    pass

def pptx_bytes_to_pdf(pptx_bytes: bytes, timeout: int = 60) -> bytes:
    """
    Converts PPTX bytes to PDF bytes using PowerPoint COM (Windows) 
    or LibreOffice (Fallback).
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        input_pptx = os.path.join(tmpdir, "report.pptx")
        output_pdf = os.path.join(tmpdir, "report.pdf")
        
        with open(input_pptx, "wb") as f:
            f.write(pptx_bytes)
            
        # Strategy 1: Windows PowerPoint COM (Highest Fidelity)
        if HAS_WIN32:
            try:
                import pythoncom
                pythoncom.CoInitialize()
                powerpoint = win32com.client.DispatchEx("PowerPoint.Application")
                # ppFixedFormatTypePDF = 2
                deck = powerpoint.Presentations.Open(input_pptx, WithWindow=False)
                deck.SaveAs(output_pdf, 32) # 32 is ppSaveAsPDF
                deck.Close()
                powerpoint.Quit()
                
                if os.path.exists(output_pdf):
                    with open(output_pdf, "rb") as f:
                        return f.read()
            except Exception as e:
                print(f"PowerPoint COM failed: {e}")
                # Fall through to Strategy 2
        
        # Strategy 2: LibreOffice Soffice
        soffice_path = os.environ.get("SOFFICE_BIN", "soffice")
        if soffice_path == "soffice":
            for p in [r"C:\Program Files\LibreOffice\program\soffice.exe", 
                      r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"]:
                if os.path.exists(p):
                    soffice_path = f'"{p}"'
                    break
        
        import subprocess
        try:
            cmd = f'{soffice_path} --headless --convert-to pdf --outdir "{tmpdir}" "{input_pptx}"'
            subprocess.run(cmd, shell=True, capture_output=True, timeout=timeout)
            if os.path.exists(output_pdf):
                with open(output_pdf, "rb") as f:
                    return f.read()
        except Exception:
            pass
            
        raise PdfConversionError("Could not convert PPTX to PDF. Neither PowerPoint nor LibreOffice was available/successful.")

def pptx_to_images(pptx_bytes: bytes) -> list:
    if not HAS_WIN32:
        print("DEBUG: HAS_WIN32 is False")
        return []
        
    images = []
    import pythoncom
    pythoncom.CoInitialize()
    powerpoint = None
    deck = None
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            input_pptx = os.path.abspath(os.path.join(tmpdir, "report_img.pptx"))
            with open(input_pptx, "wb") as f:
                f.write(pptx_bytes)
            
            # Use Dispatch instead of DispatchEx to reuse existing process if possible,
            # but DispatchEx is safer for isolation. Let's try to be more robust.
            try:
                powerpoint = win32com.client.DispatchEx("PowerPoint.Application")
            except Exception as e:
                print(f"DEBUG: Failed to dispatch PowerPoint: {e}")
                return []

            # Ensure we call Open with absolute path
            try:
                deck = powerpoint.Presentations.Open(input_pptx, WithWindow=False, ReadOnly=True)
            except Exception as e:
                print(f"DEBUG: Failed to open presentation: {e}")
                return []

            slide_count = deck.Slides.Count
            print(f"DEBUG: Deck opened. Slides count: {slide_count}")
            
            for i in range(1, slide_count + 1):
                try:
                    slide = deck.Slides(i)
                    img_path = os.path.abspath(os.path.join(tmpdir, f"slide_{i}.png"))
                    slide.Export(img_path, "PNG")
                    if os.path.exists(img_path):
                        with open(img_path, "rb") as f:
                            images.append(f.read())
                    else:
                        print(f"DEBUG: Export failed for slide {i} at {img_path}")
                except Exception as e:
                    print(f"DEBUG: Error exporting slide {i}: {e}")
            
            deck.Close()
            deck = None
    except Exception as e:
        print(f"DEBUG: pptx_to_images error: {e}")
    finally:
        if deck:
            try: deck.Close()
            except: pass
        if powerpoint:
            try: powerpoint.Quit()
            except: pass
        try: pythoncom.CoUninitialize()
        except: pass
            
    return images
