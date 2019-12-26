// SPDX-License-Identifier: AGPL-3.0-or-later
const { Writable } = require('streamx')
const { omit } = require('lodash')

/**
 * Fast streaming ndjson parser implementation that uses streamx.
 */
class Parser extends Writable {
  /**
   * Instantiate a new parser
   * @param opts.objectStream {boolean} bypass binary scanning
   * @param opts.process {function} alternative process handler
   */
  constructor (opts = {}) {
    super()
    if (opts.process) this.process = opts.process
    this._isObjectStream = opts.isObjectStream
    this._carry = null
  }

  process (data) {
    throw new Error('Parser#process() Not Implemented: Please provide' +
      'the process(data) handler either by extension or as a constructor option')
  }

  _encode (chunk) {
    if (typeof chunk === 'string') return chunk
    else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(chunk)) {
      return chunk.toString('utf8')
    } else if (chunk instanceof Uint8Array) {
      return new TextDecoder().decode(chunk)
    } else return chunk
  }

  _concat (chunks) {
    if (typeof chunks[0] === 'string') return chunks.join('')
    const nSize = chunks.reduce((s, c) => s + c.length, 0)
    const buffer = typeof Buffer !== 'undefined'
      ? Buffer.alloc(nSize)
      : Uint8Array(nSize)
    let off = 0
    for (const chunk of chunks) {
      let i = 0
      for (; i < chunk.length; i++) buffer[off + i] = chunk[i]
      off += i
    }
    return buffer
  }

  _write (data, cb) {
    if (this._isObjectStream) {
      this.process(data)
    } else {
      let o = 0
      let i = 1
      for (; i < data.length; i++) {
        if (data[i] !== 10 && data[i] !== '\n') continue // TODO: /\r\n|[\n\v\f\r\x85\u2028\u2029]/
        let slice = data.slice(o, i)
        o = i + 1
        i += 2
        if (this.carry) {
          slice = this._concat([this.carry, slice])
          this.carry = null
        }

        const ev = JSON.parse(this._encode(slice))
        this.process(ev)
      }
      if (o < i) this.carry = data.slice(o)
      if (typeof cb === 'function') cb(null)
    }
  }
}

class TimelineAggregator extends Parser {
  constructor (opts) {
    super(opts)
    this._rnames = []
    this.reducers = {}
    this._lastTick = 0
    this._state = { iteration: 0 }
    this._cache = {}
  }

  process (ev) {
    if (ev.iteration > this._lastTick) {
      this.emit('snapshot', this._state, this._lastTick)
      this._state = { iteration: ev.iteration }
      this._cache = {}
      this._lastTick = ev.iteration
    }

    for (const prop of this._rnames) {
      const cache = this._cache[prop] = this._cache[prop] || {}
      this._state[prop] = Array.isArray(this.reducers[prop])
        ? this.reducers[prop].reduce((s, r) => r(s, ev, cache), this._state[prop])
        : this.reducers[prop](this._state[prop], ev, cache)
    }
  }

  setReducer (prop, handler) {
    if (this._rnames.indexOf(prop) === -1) this._rnames.push(prop)
    this.reducers[prop] = handler
  }

  pushReducer (prop, handler) {
    if (this._rnames.indexOf(prop) === -1) this._rnames.push(prop)
    const current = this.reducers[prop]
    if (!Array.isArray(current)) {
      this.reducers[prop] = current ? [current] : []
    }
    this.reducers[prop].push(handler)
  }
}

function evFilter (ev, type, ...evNames) {
  return ev.type === type && evNames.indexOf(ev.event) !== -1
}
function ReducePeers (peers, ev, lut) {
  if (!evFilter(ev, 'peer', 'tick')) return peers || []
  if (!peers) peers = []
  const peer = omit(ev, ['type', 'event', 'sessionId', 'iteration', 'time'])
  peers.push(peer)
  lut[peer.id] = peer
  return peers
}

function ReduceConnections (sockets, ev, lut) {
  if (!evFilter(ev, 'socket', 'tick')) return sockets || []
  if (!sockets) sockets = []
  const sock = omit(ev, ['type', 'event', 'sessionId', 'iteration', 'time'])
  sockets.push(sock)
  lut[sock.id] = sock
  return sockets
}

function SimulatorTickReducer (v, ev) {
  if (!evFilter(ev, 'simulator', 'tick')) return v || {}
  return omit(ev, ['type', 'event'])
}

function InterconnectivityCounter (stats, ev, cache) {
  if (!evFilter(ev, 'simulator', 'tick')) return stats || {}
  let cap = 0
  for (let n = 0; n < ev.peers; n++) cap += n
  if (cap) stats.interconnection = stats.connections / cap
  return stats
}

class BasicTimeline extends TimelineAggregator {
  constructor (opts) {
    super(opts)
    this.setReducer('stats', [SimulatorTickReducer, InterconnectivityCounter])
    this.setReducer('peers', ReducePeers)
    this.setReducer('links', ReduceConnections)
  }
}

module.exports = {
  Parser,
  TimelineAggregator,
  BasicTimeline
}
