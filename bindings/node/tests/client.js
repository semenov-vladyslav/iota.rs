const { ClientBuilder } = require('../lib')
const { assertAddress, assertMessageId, assertMessage } = require('./assertions')
const assert = require('assert')

const seed = '256a818b2aac458941f7274985a410e57fb750f3a3a67969ece5bd9ae7eef5b2'

const client = new ClientBuilder()
  .node('http://localhost:14265')
  .brokerOptions({ timeout: 50 })
  .build()

describe('Client', () => {
  it('gets tips', async () => {
    const tips = await client.getTips()
    assert.strictEqual(Array.isArray(tips), true)
    assert.strictEqual(tips.length, 2)
    assertMessageId(tips[0])
    assertMessageId(tips[1])
  })

  it('finds addresses', () => {
    const addresses = client.findAddresses(seed)
      .path("m/0'/0'")
      .range(0, 5)
      .get()
    assert.strictEqual(Array.isArray(addresses), true)
    assert.strictEqual(addresses.length, 5)
    addresses.forEach(assertAddress)
  })

  it('sends a value transaction and checks output balance', async () => {
    const depositAddress = 'iot1q9jyad2efwyq7ldg9u6eqg5krxdqawgcdxvhjlmxrveylrt4fgaqj30s9qj'
    const messageId = await client
      .send(seed)
      .path("m/0'/0'")
      .output(depositAddress, 2)
      .submit()
    assertMessageId(messageId)

    const depositBalance = await client.getAddressBalance(depositAddress)
    assert.strictEqual(depositBalance >= 2, true)
  })

  it('gets an unspent address', async () => {
    const res = await client.getUnspentAddress(seed).index(5).path("m/0'/0'").get()
    assert.strictEqual(Array.isArray(res), true)
    assert.strictEqual(res.length, 2)
    const [address, index] = res
    assertAddress(address)
    assert.strictEqual(index, 5)
  })

  it('gets seed balance', async () => {
    const balance = await client.getBalance(seed).path("m/0'/0'").index(50000).get()
    assert.strictEqual(balance, 0)
  })

  it('get milestone and message', async () => {
    const milestone = await client.getMilestone(1)
    assert.strictEqual(typeof milestone, 'object')
    assert.strictEqual('messageId' in milestone, true)
    assertMessageId(milestone.messageId)

    const message = await client.getMessage().data(milestone.messageId)
    assertMessage(message)

    
    const children = await client.getMessage().children(milestone.messageId)
    assert.strictEqual(Array.isArray(children), true)

    const metadata = await client.getMessage().metadata(milestone.messageId)
    assert.strictEqual(typeof metadata, 'object')
    assert.strictEqual('messageId' in metadata, true)
    assertMessageId(metadata.messageId)
    assert.strictEqual(metadata.messageId, milestone.messageId)

    const raw = await client.getMessage().raw(milestone.messageId)
    assert.strictEqual(typeof raw, 'string')
  })

  it('get address outputs', async () => {
    const outputs = await client.getAddressOutputs('6920b176f613ec7be59e68fc68f597eb3393af80f74c7c3db78198147d5f1f92')
    assert.strictEqual(Array.isArray(outputs), true)
    assert.strictEqual(outputs.length > 0, true)
    assert.strictEqual(typeof outputs[0], 'string')
    assert.strictEqual(outputs[0].length, 68)

    const output = await client.getOutput(outputs[0])
    assert.strictEqual(typeof output, 'object')
    assert.strict('messageId' in output, true)
    assertMessageId(output.messageId)
  })

  it('submits an indexation message and reads it', async () => {
    const tips = await client.getTips()
    const indexation = {
      index: 'IOTA.RS BINDING - NODE.JS',
      data: 'INDEXATION DATA'
    }
    const messageId = await client.postMessage({
      parent1: tips[0],
      parent2: tips[1],
      payload: indexation,
      nonce: 0
    })
    assertMessageId(messageId)

    const message = await client.getMessage().data(messageId)
    assertMessage(message)
    assert.strictEqual(typeof message.payload.Indexation, 'object')
    const encoder = new TextEncoder()
    assert.deepStrictEqual(message.payload.Indexation, {
      index: indexation.index,
      data: Array.from(encoder.encode(indexation.data))
    })
  })

  it('gets info', async () => {
    const info = await client.getInfo()
    assert.strictEqual(typeof info, 'object')
    assert.strictEqual('name' in info, true)
    assert.strictEqual(info.name, 'HORNET')
  })
})
