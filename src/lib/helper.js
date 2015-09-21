/**
 * Copyright 2015 creditease Inc. All rights reserved.
 * @description command helper
 * @author evan2x(evan2zaw@gmail.com/aiweizhang@creditease.cn)
 * @date  2015/08/03
 */

import path from 'path';
import fs from 'fs';
import url from 'url';
import os from 'os';
import zlib from 'zlib';


import chalk from 'chalk';
import tar from 'tar';
import cheerio from 'cheerio';

import {
    CWD,
    CONFIG_PATH,
    SERVER_CONFIG_PATH
} from './constant';

function download(src = '', target = CWD){
    let size = 0,
        chunkedSize = 0,
        options = url.parse(src),
        filename = path.basename(options.path),
        http = options.protocol === 'https:' ? require('https') : require('http');

    target = path.join(target, filename);

    return new Promise((resolve, reject) => {
        let client = http.get(src, res => {
            let status = res.statusCode;

            if(status === 200){
                console.log(chalk.cyan('donwload the file from %s ...'), src);

                let outStream = fs.createWriteStream(target);
                res.on('data', data => {
                    outStream.write(data);
                    size += data.length;
                    // 每下载500KB，提示一次
                    if(size - chunkedSize > 500 * 1024){
                        console.log(chalk.cyan('%s file downloaded %dKB.'), filename, Math.floor(size / 1024));
                        chunkedSize = size;
                    }
                });

                res.on('end', () => {
                    outStream.end();
                    console.log(
                        chalk.green('%s file download is complete, the file total size is %dKB.'),
                        filename,
                        Math.floor(size / 1024)
                    );
                    resolve(target);
                });

                res.on('error', err => reject(err));
            } else {
                client.abort();
                console.error(chalk.red('downloading error, status code: %d'), status);
                reject(status, res.statusMessage);
            }
        });
    });
}

/**
 * 解压tar.gz文件
 * @param {Object} opts
 * @param {String} opts.pack   tar.gz包的路径
 * @param {String} opts.target 解压到指定目录
 * @param {Number} opts.strip
 */
function untargz(opts){
    return new Promise((resolve, reject) => {
        fs.createReadStream(opts.pack)
            .pipe(zlib.createGunzip())
            .pipe(tar.Extract({
                path: opts.target,
                strip: opts.strip || 0
            }))
            .on('error', err => {
                if(err) console.error(chalk.red(err));
                reject(err);
            })
            .on('end', () => {
                if(fs.existsSync(opts.pack)){
                    fs.unlinkSync(opts.pack);
                }
                resolve();
            });
    });
}

/**
 * 读取marmot的配置文件
 * @return {Object}
 */
function readRCFile(){
    if(!fs.existsSync(CONFIG_PATH)){
        console.error(chalk.red('.marmotrc file not found, please run <marmot init>'));
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH));
}

/**
 * 读取tomcat的server.xml文件
 * @return {Object}
 */
function readServerFile(){
    let config = '';

    if(fs.existsSync(SERVER_CONFIG_PATH)){
        config = fs.readFileSync(SERVER_CONFIG_PATH, 'utf8');
    }

    return cheerio.load(config, {
        normalizeWhitespace: true,
        xmlMode: true
    });
}

/**
 * 序列化为web.xml格式的参数配置
 * @param  {Object} params 参数表
 * @return {String}
 */
function serializeXMLParams(params) {
    let fragment = '';
    for(let key in params){
        if(params.hasOwnProperty(key)){
            fragment += `<init-param>
                          <param-name>${key}</param-name>
                          <param-value>${params[key]}</param-value>
                        </init-param>`;
        }
    }
    return fragment;
}

/**
 * 检测是否为windows平台
 * @return {Boolean}
 */
function isWin(){
    let platform = os.platform();

    if(platform === 'win32' || platform === 'win64'){
        return true;
    }

    return false;
}

/**
 * 控制台中打印一张表
 * @param  {Object} tables
 * @example
 * {
 *     head: ['name', 'port', 'path'],
 *     body: [
 *         ['app', 8080, '/path/to/app']
 *     ]
 * }
 */
function printTables(tables = {
    head: [],
    body: []
}){
    let space = ' ',
        output = '',
        placeholder = '',
        max = [],
        list = [tables.head].concat(tables.body),
        /**
         * 将传入的数组转化为一行数据
         * @param {Array}
         * @return {String}
         */
        convert = (arr) => {
            let str = '|';
            arr.forEach((v, i) => {
                placeholder = space.repeat(max[i] - v.length);
                str += `  ${v}${placeholder}  |`;
            });
            return str + '\n';
        },
        /**
         * 分割线
         * @return {String}
         */
        divide = () => {
            return (
                '|' +
                '-'.repeat(max.reduce((p, v) => p + v) + max.length * 5 - 1) +
                '|\n'
            );
        };

    list.forEach(item => {
        max = item.map((v, i) => max[i] ? Math.max(max[i], v.length) : v.length);
    });

    output += '\n';
    output += divide();
    output += convert(tables.head);
    output += divide();
    tables.body.forEach(item => {
        output += convert(item);
    });
    output += divide();

    process.stdout.write(output);
}

export {
    download, untargz, readRCFile,
    readServerFile, serializeXMLParams, isWin,
    printTables
}