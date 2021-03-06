export const CONTAINER: any = {};

import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as KoaBody from 'koa-body';
import * as cors from '@koa/cors';
import { createConnection } from 'typeorm';
import 'reflect-metadata';
import { getAllFiles } from './utils/file';
const Path = require('path');

const app = new Koa();

(async function init() {
    try {

        //数据库连接
        await createConnection({
            "type": "mysql",
            "host": "",   // 数据库地址
            "port": 3306,       //数据库端口
            "username": "",   // 数据库用户名
            "password": "",    // 数据库密码
            "database": "Test",     // 数据库名称
            "synchronize": true,
            "entities": [
                "src/PO/*.ts"
            ],
            "cli": {
                "entitiesDir": "src/PO"
            }
        })

        // 引入controller
        const ControllerPath = 'Controller';
        const path = Path.join(__dirname, ControllerPath);
        const filesList = [];
        await getAllFiles(path, filesList)
        filesList.forEach(path => require(path))

        // 路由分配
        const router = new Router();
        Object.keys(CONTAINER).forEach(key => {
            if (key.match(/controller/i)) {
                const { _routes, _basePath = '', _params } = CONTAINER[key]
                _routes.forEach(route => {
                    router[route['httpMethod']](_basePath + route['path'], async (ctx, next) => {
                        const params = []

                        const methodParam = _params[route['method']];
                        if (methodParam) {
                            if (methodParam['body'] !== undefined) {
                                params[methodParam['body']] = ctx.request.body;
                            }
                            if (methodParam['param'] !== undefined) {
                                params[methodParam['param']] = ctx.request.query;
                            }
                        }

                        const res = await CONTAINER[key][route['method']](...params)
                        ctx.response.body = res
                        next()
                    })
                })
            }
        })

        // 中间件
        app.use(cors());
        app.use(KoaBody())
        app.use(router.routes());
        app.use(async (ctx, next) => {
            console.log(Date(), '\n请求方法: ', ctx.method, '\n请求路径: ', ctx.path, '\n请求参数: ', ctx.request.query, ctx.request.body, '\n返回结果: ', ctx.body)
        })

        // 启动app
        app.listen(3001);
    }
    catch (err) {
        console.log(err)
    }
})();