FROM node:12-alpine

# Install dependencies
RUN apk add --no-cache python3 py3-pip
RUN pip3 install awscli --upgrade --user

WORKDIR /srv

# npm dependencies
COPY package* /srv/
RUN npm ci

COPY . /srv

# Build
RUN npm run build

# Deploy
CMD ["sh", "-c", "~/.local/bin/aws s3 cp /srv/dist/scanthng.js s3://$BUCKET/js/scanthng/$VERSION/scanthng-$VERSION.js --acl public-read"]
