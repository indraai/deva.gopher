// Copyright (c)2022 Quinn Michaels
// Gopher Deva test file

const {expect} = require('chai')
const gopher = require('./index.js');

describe(gopher.me.name, () => {
  beforeEach(() => {
    return gopher.init()
  });
  it('Check the DEVA Object', () => {
    expect(gopher).to.be.an('object');
    expect(gopher).to.have.property('agent');
    expect(gopher).to.have.property('vars');
    expect(gopher).to.have.property('listeners');
    expect(gopher).to.have.property('methods');
    expect(gopher).to.have.property('modules');
  });
})
