pipeline {
    agent any

    environment {
        IMAGE_NAME = "queenkoba-backend"
        CONTAINER_NAME = "queenkoba-backend"
        HOST_PORT = "5001"
        CONTAINER_PORT = "5000"
        BACKEND_DIR = "koba--backend-only/backend/queen-koba-backend"
    }

    stages {

        stage('Build Docker Image') {
            steps {
                dir("${BACKEND_DIR}") {
                    sh 'docker build -t ${IMAGE_NAME}:latest .'
                }
            }
        }

        stage('Stop Old Container') {
            steps {
                sh '''
                    docker stop ${CONTAINER_NAME} || true
                    docker rm ${CONTAINER_NAME} || true
                '''
            }
        }

        stage('Run New Container') {
            steps {
                sh '''
                    docker run -d \
                    --name ${CONTAINER_NAME} \
                    -p ${HOST_PORT}:${CONTAINER_PORT} \
                    ${IMAGE_NAME}:latest
                '''
            }
        }

        stage('Check Backend') {
            steps {
                sh '''
                    sleep 5
                    docker ps
                    curl -f http://localhost:${HOST_PORT}/health
                '''
            }
        }
    }
}
