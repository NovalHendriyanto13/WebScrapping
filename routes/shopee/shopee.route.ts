import express from "express";
import * as shopeeController from '../../app/controllers/api/shopee.controller';

const route = express.Router();

route.post('/', shopeeController.scrapping);
route.post('/mozilla', shopeeController.scrappingMozilla);
route.get('/scrapping', shopeeController.getScrapping);

export default route;