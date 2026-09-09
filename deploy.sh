#!/bin/bash
set -e

echo "Building..."
npm run build

echo "Uploading to server..."
scp -o StrictHostKeyChecking=no -r dist edwin@100.97.142.96:/home/edwin/portal-dist-tmp

echo "Installing..."
ssh -o StrictHostKeyChecking=no edwin@100.97.142.96 "sudo cp -r /home/edwin/portal-dist-tmp/* /var/www/wisopay-engine/portal/ && rm -rf /home/edwin/portal-dist-tmp"

echo "Done — portal.wisopay.io updated"
