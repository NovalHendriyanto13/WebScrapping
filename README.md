# WebScrapping

## Description

The application for Shopee Scrapping testing purpose only. The application is using docker to run but can be run stand alone as well.

## Installation

```bash
# install the dependency
$ npm install

# for setup docker run and build docker one time only
$ docker-compose build

# run the application
$ docker-compose up

```

## Running the application

```bash

#endpoints
http://localhost:3000/api/shopee [POST]

payload: {
    "storeId": "178926468",
    "dealId": "21448123549",
    "item": "a"
}

http://localhost:3000/api/shopee/scrapping?storeId=178926468&dealId=21448123549&item=a [GET]
Get scrapping Shopee
```

## ENV File

```bash
APP_NAME="Web Scrapping"
APP_PORT=3000

SHOPEE_BASE_API="https://shopee.tw"
```