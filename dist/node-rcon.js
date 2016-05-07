'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _dgram = require('dgram');

var _dgram2 = _interopRequireDefault(_dgram);

var _buffer = require('buffer');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var PacketType = {
  COMMAND: 0x02,
  AUTH: 0x03,
  RESPONSE_VALUE: 0x00,
  RESPONSE_AUTH: 0x02
};

var Rcon = function (_events$EventEmitter) {
  _inherits(Rcon, _events$EventEmitter);

  function Rcon(host, port, password, options) {
    var _ret;

    _classCallCheck(this, Rcon);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Rcon).call(this));

    if (!(_this instanceof Rcon)) return _ret = new Rcon(host, port, password, options), _possibleConstructorReturn(_this, _ret);
    options = options || {};

    _this.host = host;
    _this.port = port;
    _this.password = password;
    _this.rconId = options.id || 0x0012D4A6;
    _this.hasAuthed = false;
    _this.outstandingData = null;
    _this.tcp = options.tcp == null ? true : options.tcp;
    _this.challenge = options.challenge == null ? true : options.challenge;
    return _this;
  }

  _createClass(Rcon, [{
    key: 'send',
    value: function send(data, cmd, id) {
      var sendBuf = void 0;
      if (this.tcp) {
        cmd = cmd || PacketType.COMMAND;
        id = id || this.rconId;

        var length = _buffer.Buffer.byteLength(data);
        sendBuf = new _buffer.Buffer(length + 16);
        sendBuf.writeInt32LE(length + 12, 0);
        sendBuf.writeInt32LE(id, 4);
        sendBuf.writeInt32LE(cmd, 8);
        sendBuf.write(data, 12);
        sendBuf.writeInt32LE(0, length + 12);
      } else {
        if (this.challenge && !this._challengeToken) {
          this.emit('error', new Error('Not authenticated'));
          return;
        }
        var str = "rcon ";
        if (this._challengeToken) str += this._challengeToken + " ";
        if (this.password) str += this.password + " ";
        str += data + "\n";
        sendBuf = new _buffer.Buffer(4 + _buffer.Buffer.byteLength(str));
        sendBuf.writeInt32LE(-1, 0);
        sendBuf.write(str, 4);
      }
      this._sendSocket(sendBuf);
    }
  }, {
    key: 'connect',
    value: function connect() {
      var _this2 = this;

      if (this.tcp) {
        this._tcpSocket = _net2.default.createConnection(this.port, this.host);
        this._tcpSocket.on('data', function (data) {
          return _this2._tcpSocketOnData(data);
        }).on('connect', function () {
          return _this2.socketOnConnect();
        }).on('error', function (err) {
          return _this2.emit('error', err);
        }).on('end', function () {
          return _this2.socketOnEnd();
        });
      } else {
        this._udpSocket = _dgram2.default.createSocket("udp4");
        this._udpSocket.on('message', function (data) {
          return _this2._udpSocketOnData(data);
        }).on('listening', function () {
          return _this2.socketOnConnect();
        }).on('error', function (err) {
          return _this2.emit('error', err);
        }).on('close', function () {
          return _this2.socketOnEnd();
        });
        this._udpSocket.bind(0);
      }
    }
  }, {
    key: 'disconnect',
    value: function disconnect() {
      if (this._tcpSocket) this._tcpSocket.end();
      if (this._udpSocket) this._udpSocket.close();
    }
  }, {
    key: 'setTimeout',
    value: function setTimeout(timeout, callback) {
      var _this3 = this;

      if (!this._tcpSocket) return;

      this._tcpSocket.setTimeout(timeout, function () {
        _this3._tcpSocket.end();
        if (callback) callback();
      });
    }
  }, {
    key: '_sendSocket',
    value: function _sendSocket(buf) {
      if (this._tcpSocket) {
        this._tcpSocket.write(buf.toString('binary'), 'binary');
      } else if (this._udpSocket) {
        this._udpSocket.send(buf, 0, buf.length, this.port, this.host);
      }
    }
  }, {
    key: '_udpSocketOnData',
    value: function _udpSocketOnData(data) {
      var a = data.readUInt32LE(0);
      if (a == 0xffffffff) {
        var str = data.toString("utf-8", 4);
        var tokens = str.split(" ");
        if (tokens.length == 3 && tokens[0] == "challenge" && tokens[1] == "rcon") {
          this._challengeToken = tokens[2].substr(0, tokens[2].length - 1).trim();
          this.hasAuthed = true;
          this.emit('auth');
        } else {
          this.emit('response', str.substr(1, str.length - 2));
        }
      } else {
        this.emit('error', new Error("Received malformed packet"));
      }
    }
  }, {
    key: '_tcpSocketOnData',
    value: function _tcpSocketOnData(data) {
      if (this.outstandingData != null) {
        data = _buffer.Buffer.concat([this.outstandingData, data], this.outstandingData.length + data.length);
        this.outstandingData = null;
      }

      while (data.length) {
        var len = data.readInt32LE(0);
        if (!len) return;

        var id = data.readInt32LE(4);
        var type = data.readInt32LE(8);

        if (len >= 10 && data.length >= len + 4) {
          if (id == this.rconId) {
            if (!this.hasAuthed && type == PacketType.RESPONSE_AUTH) {
              this.hasAuthed = true;
              this.emit('auth');
            } else if (type == PacketType.RESPONSE_VALUE) {
              var str = data.toString('utf8', 12, 12 + len - 10);

              if (str.charAt(str.length - 1) === '\n') {
                str = str.substring(0, str.length - 1);
              }

              this.emit('response', str);
            }
          } else {
            this.emit('error', new Error("Authentication failed"));
          }

          data = data.slice(12 + len - 8);
        } else {
          this.outstandingData = data;
          break;
        }
      }
    }
  }, {
    key: 'socketOnConnect',
    value: function socketOnConnect() {
      this.emit('connect');

      if (this.tcp) {
        this.send(this.password, PacketType.AUTH);
      } else if (this.challenge) {
        var str = "challenge rcon\n";
        var sendBuf = new _buffer.Buffer(str.length + 4);
        sendBuf.writeInt32LE(-1, 0);
        sendBuf.write(str, 4);
        this._sendSocket(sendBuf);
      } else {
        var _sendBuf = new _buffer.Buffer(5);
        _sendBuf.writeInt32LE(-1, 0);
        _sendBuf.writeUInt8(0, 4);
        this._sendSocket(_sendBuf);

        this.hasAuthed = true;
        this.emit('auth');
      }
    }
  }, {
    key: 'socketOnEnd',
    value: function socketOnEnd() {
      this.emit('end');
      this.hasAuthed = false;
    }
  }]);

  return Rcon;
}(_events2.default.EventEmitter);

exports.default = Rcon;
