pipeline {
    agent any

    environment {
        IMAGE_NAME = "queenkoba-backend"
        CONTAINER_NAME = "queenkoba-backend"
        HOST_PORT = "5001"
        CONTAINER_PORT = "5000"
    }

    stages {

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $IMAGE_NAME:latest .'
            }
        }

        stage('Stop Old Container') {
            steps {
                sh '''
                    docker stop $CONTAINER_NAME || true
                    docker rm $CONTAINER_NAME || true
                '''
            }
        }

        stage('Run New Container') {
            steps {
                sh '''
                    docker run -d \
                    --name $CONTAINER_NAME \
                    -p $HOST_PORT:$CONTAINER_PORT \
                    $IMAGE_NAME:latest
                '''
            }
        }

        stage('Check Backend') {
            steps {
                sh '''
                    docker ps
                    curl -f http://localhost:5001/health
                '''
            }
        }
    }
}
