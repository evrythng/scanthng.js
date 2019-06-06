FROM node:8-alpine

WORKDIR /srv
COPY . /srv

# Install dependencies
RUN apk add --no-cache python3
RUN pip3 install awscli --upgrade --user
RUN npm i

# Build
RUN npm run build

# Deploy
CMD ["sh", "-c", "~/.local/bin/aws s3 cp /srv/dist/scanthng.js s3://$BUCKET/js/scanthng/$VERSION/scanthng-$VERSION.js --acl public-read"]
