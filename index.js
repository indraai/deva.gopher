// Copyright (c)2022 Quinn Michaels
// Gopher Deva

const net = require('net');
const fs = require('fs');
const path = require('path');

const data_path = path.join(__dirname, 'data.json');
const {agent,vars} = require(data_path).data;

const Deva = require('@indra.ai/deva');
const GOPHER = new Deva({
  agent: {
    uid: agent.uid,
    key: agent.key,
    name: agent.name,
    describe: agent.describe,
    prompt: agent.prompt,
    voice: agent.voice,
    profile: agent.profile,
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
            if (lformat.length) dir.push(`\nl: ${lformat}`);
            break;

          default:
            if (l === '.') break;
            const split = l.substring(1).split('\t');
            dir.push(`\ncmd[${split[0]}]:#gopher get ${split[2]}:${split[3]}${split[1]}`);
        }
      }
      return dir.join('\n');
    }
  },
  vars,
  listeners: {},
  modules: {},
  deva: {},
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

            const data = this.agent.parse(this.vars.server.data);

            this.question(`#feecting parse ${data}`).then(parsed => {
              this.vars.server.stop = new Date();
              this.func.reset();
              return resolve({
                text: parsed.a.text,
                html: parsed.a.html,
                data: parsed.a.data,
              })
            }).catch(err => {
              return this.error(err, false, reject);
            });
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
      return this.func.get(`${this.vars.default.search}?${packet.q.text}`);
    },

    /**************
    method: get
    params: packet
    describe: Get a gopher resource request
    ***************/
    get(packet) {
      return this.func.get(packet.q.text);
    },

    /**************
    method: uid
    params: packet
    describe: Return a system id to the user from the Gopher Deva.
    ***************/
    uid(packet) {
      return Promise.resolve({text:this.uid()});
    },

    /**************
    method: status
    params: packet
    describe: Return the current status of the Gopher Deva.
    ***************/
    status(packet) {
      return this.status();
    },

    /**************
    method: help
    params: packet
    describe: The Help method returns the information on how to use the Gopher Deva.
    ***************/
    help(packet) {
      return new Promise((resolve, reject) => {
        this.lib.help(packet.q.text, __dirname).then(help => {
          return this.question(`#feecting parse ${help}`);
        }).then(parsed => {
          return resolve({
            text: parsed.a.text,
            html: parsed.a.html,
            data: parsed.a.data,
          });
        }).catch(reject);
      });
    }
  },
  onError(err) {
    console.error(err);
  }
});
module.exports = GOPHER
