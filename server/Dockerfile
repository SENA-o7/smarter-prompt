# Smarter Prompt sunucusu — Docker imajı
#
# Yerelde (repo kökünden):   docker compose up --build
# Elle:                      docker build -t smarter-prompt-server server
#                            docker run -p 8000:8000 --env-file server/.env smarter-prompt-server
#
# API anahtarı imajın İÇİNE KONMAZ; çalıştırırken ortam değişkeni (--env-file / platform ayarı) olarak verilir.

FROM python:3.12-slim

# Python'un .pyc yazmaması ve çıktıyı anında göstermesi (loglar Docker'da gecikmesin)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Önce yalnızca bağımlılıklar: kod değişince bu katman önbellekten gelir, kurulum tekrarlanmaz
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app

# Güvenlik: root olmayan kullanıcıyla çalış; seçim/geri bildirim kayıtları /app/veri'ye yazılır
RUN useradd --create-home sunucu && mkdir -p /app/veri && chown sunucu /app/veri
USER sunucu

# Render / Hugging Face gibi platformlar portu PORT değişkeniyle verir; yoksa 8000
ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD python -c "import urllib.request,os; urllib.request.urlopen(f'http://localhost:{os.environ[\"PORT\"]}/health')"

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
