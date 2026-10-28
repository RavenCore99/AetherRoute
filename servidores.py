from fastapi import FastAPI
import uvicorn
import argparse
import sys


app = FastAPI(
    title="Servidor de la Red Dinamica"
)

parser = argparse.ArgumentParser(description="Servidor de la Red Dinamica")
parser.add_argument("puerto", type=int, help="Puerto donde escuchara el servidor")
parser.add_argument("nombre", help="Nombre del servidor")
args = parser.parse_args()

puerto = args.puerto
nombre = args.nombre

contador=0

@app.get("/")
def inicio ():
    return {
        "servidor": nombre,
        "mensaje" : "Servidor disponible",
        "puerto" : puerto
    }
@app.get("/Procesar")
def procesar():
    global contador
    contador += 1
    return {
        "servidor": nombre,
        "puerto" : puerto,
        "mensaje" : "Solicitudes recibidas",
        "contador" : contador,
        "resultado" : "Solicitudes procesadas correctamente"
        
        
    }

@app.get("/health")
def health():
    return {
         "servidor": nombre,
         "estado" : "Activo",
         "puerto" : puerto,


    }

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=puerto
    )