// Copyright (c)2025 Quinn Michaels
// Gopher Deva

import Deva from '@indra.ai/deva';
import net from 'node:net';
import pkg from './package.json' with {type:'json'};

import data from './data.json' with {type:'json'};
const {agent,vars} = data.DATA;

// set the __dirname
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';    
const __dirname = dirname(fileURLToPath(import.meta.url));

const info = {
  id: pkg.id,
  name: pkg.name,
  describe: pkg.description,
  version: pkg.version,
  url: pkg.homepage,
  dir: __dirname,
  git: pkg.repository.url,
  bugs: pkg.bugs.url,
  author: pkg.author,
  license: pkg.license,
  copyright: pkg.copyright,
};

const GOPHER = new Deva({
  info,
  agent,
  vars,
  utils: {
    translate(input) {
      return input.trim();
    },
    parse(input) {
      const data = Buffer.concat(input).toString();
      const arr = data.replace(/\r\n/g,'\n').split('\n');
      const dir = [];

      for (let x =0; x < arr.length; ++x) {
        const l = arr[x].trim();
        if (!l.length) break;

        switch (l[0]) {
          case 'i':
          case '3':
            const lformat = l.substring(1).split('\t')[0].replace('\t', '').trim();
            if (lformat.length) dir.push(`l: ${lformat}`);
            break;

          default:
            if (l === '.') break;
            const split = l.substring(1).split('\t');
            dir.push(`cmd[${split[0]}]:#gopher get ${split[2]}:${split[3]}${split[1]}`);
        }
      }
      return dir.join('\n');
    }
  },
  vars,
  listeners: {},
  modules: {},
  devas: {},
  func: {
    toShortURI() {
      const {host, port, type, selector, name} = this.vars.server;
      return encodeURI('gopher://'+host+':'+port+'/'+type+selector+( (this.query!==false)?'?'+this.query:'' ) );
    },
    toURI() {
      const {name} = this.vars.server;
      return this.func.toShortURI()+( (name)?'#'+encodeURIComponent(name):'' );
    },
    toDirectoryEntity() {
      const {name, selector, host, port} = this.vars.server;
      return type+name+'\t'+selector+'\t'+host+'\t'+port+'\r\n';
    },
    toJson() {
  		return JSON.stringify(this.vars);
  	},
    reset() {

      // push a new record to the server history index.
      this.vars.history.push({
        host: this.vars.server.host,
        port: this.vars.server.port,
        ipaddr: this.vars.server.ipaddr,
        start: this.vars.server.start,
        stop: this.vars.server.stop,
      });

      // clear server variables for new server.
      this.vars.server.active = false;
      this.vars.server.ipaddr = false;
      this.vars.server.stop = false;
      this.vars.server.host = false;
      this.vars.server.post = false;
      this.vars.server.selector = false;
      this.vars.server.query = false;
      this.vars.server.data = [];
    },
    get(q) {
      return new Promise((resolve, reject) => {
        const gReg = new RegExp(this.vars.uripattern);
        const matches = gReg.exec(decodeURI(q));

        this.vars.server.active = true;
        this.vars.server.start = new Date();
        this.vars.server.stop = false;

        this.vars.server.host = matches[2] ? matches[2] : this.vars.default.host;
  			this.vars.server.port = matches[3] ? matches[3].substring(1) : this.vars.default.port;
  			// this.vars.server.type = matches[5] ? matches[5] : 1;
  			this.vars.server.selector = matches[4] ? matches[4] : '';
  			this.vars.server.query = matches[5] ? matches[5] : false;
  			this.vars.server.name = matches[6] ? matches[6].substring(1):this.func.toURI();
        
        const socket = net.createConnection({
          host:this.vars.server.host,
          port:this.vars.server.port,
        }, () => {
          let request = this.vars.server.selector;
          if (this.vars.server.query) request += `\t${this.vars.server.query}`;
          request += '\r\n';
          socket.write(request);
        });

        this.vars.server.ipaddr = socket.remoteAddress
        socket.on('error', err => {
          return this.error(err, q, reject);
        }).on('end', () => {

          const data = this.utils.parse(this.vars.server.data);

          this.question(`#feecting parse ${data}`).then(parsed => {
            this.vars.server.stop = new Date();
            this.func.reset();
            return resolve({
              text: parsed.a.text,
              html: parsed.a.html,
              data: {
                server: this.vars.server,
                feecting: parsed.a.data
              },
            })
          }).catch(() => {});
        }).on('data', data => {
          this.vars.server.data.push(data);
        })
      });
    }
  },
  methods: {
    /**************
    method: search
    params: packet
    describe: runs a search on the veronica search gopher agent
    ***************/
    search(packet) {
      this.context('search');
      return this.func.get(`${this.vars.default.search}?${packet.q.text}`);
    },

    /**************
    method: get
    params: packet
    describe: Get a gopher resource request
    ***************/
    get(packet) {
      this.context('get');
      return this.func.get(packet.q.text);
    },
  },
  onReady(data, resolve) {
    this.prompt(this.vars.messages.ready);
    return resolve(data);
  },
  onError(err, data, reject) {
    console.error(err);
    return reject(err);
  }
});
export default GOPHER
