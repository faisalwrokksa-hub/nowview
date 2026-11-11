FROM python:3.12-slim
WORKDIR /app
COPY dashboard.py /app/dashboard.py
COPY web /app/web
RUN useradd --create-home dashboard
USER dashboard
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "python dashboard.py --host 0.0.0.0 --port ${PORT:-8080}"]
