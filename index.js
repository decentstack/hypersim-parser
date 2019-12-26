// SPDX-License-Identifier: AGPL-3.0-or-later
const { Writable } = require('streamx')
const { omit } = require('lodash')
class Parser extends Writable {
  constructor () {
    super()
    this._rnames = []
    this._firstWrite = true
    this._isObjectStream = null
    this._carry = null
  }

  _write (data, cb) {
    if (this._firstWrite) {
      this._firstWrite = false
      this._isObjectStream = !Buffer.isBuffer(data)
    }
    if (this._isObjectStream) {
      if (typeof data === 'string') data = JSON.parse(data)
      this.parseEvent(data)
    } else {
      let o = 0
      let i = 1
      for (; i < data.length; i++) {
        if (data[i] !== 10) continue // TODO: /\r\n|[\n\v\f\r\x85\u2028\u2029]/
        let slice = data.slice(o, i)
        o = i + 1
        i += 2
        if (this.carry) {
          slice = Buffer.concat([this.carry, slice])
          this.carry = null
        }
        const ev = JSON.parse(slice.toString('utf8'))
        this.parseEvent(ev)
      }
      if (o < i) this.carry = data.slice(o)
      cb()
    }
  }
}

class TimelineAggregator extends Parser {
  constructor () {
    super()
    this.reducers = {}
    this._lastTick = 0
    this._state = { iteration: 0 }
    this._cache = {}
  }

  parseEvent (ev) {
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
function ReducePeers (peers, ev) {
  if (!evFilter(ev, 'peer', 'tick')) return peers || []
  if (!peers) peers = []
  peers.push(omit(ev, ['type', 'event', 'sessionId', 'iteration', 'time']))
  return peers
}

function ReduceConnections (sockets, ev) {
  if (!evFilter(ev, 'socket', 'tick')) return sockets || []
  if (!sockets) sockets = []
  const sock = omit(ev, ['type', 'event', 'sessionId', 'iteration', 'time'])
  sockets.push(sock)
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
  constructor () {
    super()
    this.setReducer('stats', [SimulatorTickReducer, InterconnectivityCounter])
    this.setReducer('nodes', ReducePeers)
    this.setReducer('links', ReduceConnections)
  }
}

module.exports = {
  Parser,
  TimelineAggregator,
  BasicTimeline
}
