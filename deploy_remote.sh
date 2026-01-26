HOST="152.67.201.45"
USER="knockknows"
KEY="deploy_key_v2"

ssh -i $KEY -o StrictHostKeyChecking=no $USER@$HOST << 'EOF'
    cd /home/knockknows/Discounted-Udemy-Course-Enroller || echo "Directory not found, skipping down"
    if [ -d "/home/knockknows/Discounted-Udemy-Course-Enroller" ]; then
        echo "Directory exists but might be corrupted (or permission locked)."
        echo "Attempting to move to backup..."
        mv /home/knockknows/Discounted-Udemy-Course-Enroller /home/knockknows/Discounted-Udemy-Course-Enroller.bak.$(date +%s) || echo "Move failed"
    fi
    
    echo "Cloning fresh code..."
    git clone https://github.com/knockknows/Discounted-Udemy-Course-Enroller.git /home/knockknows/Discounted-Udemy-Course-Enroller
    cd /home/knockknows/Discounted-Udemy-Course-Enroller
    
    echo "Building and Starting services..."
    # Wipe database as requested
    echo "Restarting services (keeping data)..."
    docker compose down
    
    docker compose up --build -d
    echo "Deployment Complete."
EOF
