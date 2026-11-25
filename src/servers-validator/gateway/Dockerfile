FROM --platform=linux/x86_64 python:3.15-alpine

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY proxy.py .

CMD ["python", "-u", "proxy.py"]
