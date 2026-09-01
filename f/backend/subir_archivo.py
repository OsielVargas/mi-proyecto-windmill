import base64
import uuid
import mimetypes
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

def main(
    file_base64: str,
    nombre_archivo: str,
    dominio_base: str = "https://localhost"
):
    # Credenciales hardcodeadas (cámbialas por las tuyas reales)
    access_key = "9F18526B347D9A3DE993"  # Tu access key de Filebase
    secret_key = "ClFUfBk2cvzxnuCPDAuF3ahFm9cL8RfntJFE83GB"  # Tu secret key de Filebase
    bucket = "windmill"
    endpoint = "https://s3.filebase.io"
    region = "auto"

    if not access_key or not secret_key:
        raise Exception("Faltan credenciales de Filebase")

    s3_client = boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(
            signature_version='s3v4',
            s3={'addressing_style': 'path'}
        ),
        region_name=region
    )

    if ',' in file_base64:
        file_base64 = file_base64.split(',')[1]
    file_bytes = base64.b64decode(file_base64)

    extension = nombre_archivo.split('.')[-1] if '.' in nombre_archivo else 'bin'
    unique_filename = f"{uuid.uuid4().hex}.{extension}"

    content_type, _ = mimetypes.guess_type(nombre_archivo)
    if not content_type:
        content_type = 'application/octet-stream'

    try:
        s3_client.put_object(
            Bucket=bucket,
            Key=unique_filename,
            Body=file_bytes,
            ContentType=content_type
        )
        
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': unique_filename},
            ExpiresIn=604800
        )

        return {
            "success": True,
            "url": presigned_url,
            "nombre": nombre_archivo,
            "unique_name": unique_filename,
            "message": "Archivo subido exitosamente"
        }
        
    except ClientError as e:
        return {"success": False, "error": str(e)}