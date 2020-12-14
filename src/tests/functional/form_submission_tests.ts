import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class FormSubmissionTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/form.html")
  }

  async "test standard form submission with redirect response"() {
    const button = await this.querySelector("#standard form input[type=submit]")
    await button.click()
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html")
    this.assert.equal(await this.visitAction, "advance")
  }

  async "test submitter form submission reads button attributes"() {
    const button = await this.querySelector("#submitter form button[type=submit]")
    await button.click()
    await this.nextBody

    this.assert.equal(await this.pathname, "/src/tests/fixtures/two.html")
    this.assert.equal(await this.visitAction, "advance")
  }

  async "test submitter GET submission from submitter with data-turbo-frame"() {
    await this.clickSelector("#submitter form[method=get] [type=submit][data-turbo-frame]")
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.ok(await this.hasSelector("#forms"))
    this.assert.equal(await message.getVisibleText(), "Frame redirected")
  }

  async "test submitter POST submission from submitter with data-turbo-frame"() {
    await this.clickSelector("#submitter form[method=post] [type=submit][data-turbo-frame]")
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.ok(await this.hasSelector("#forms"))
    this.assert.equal(await message.getVisibleText(), "Frame redirected")
  }

  async "test frame form GET submission from submitter with data-turbo-frame=_top"() {
    await this.clickSelector("#frame form[method=get] [type=submit][data-turbo-frame=_top]")
    await this.nextBody

    const title = await this.querySelector("h1")
    this.assert.notOk(await this.hasSelector("#forms"))
    this.assert.equal(await title.getVisibleText(), "One")
  }

  async "test frame form POST submission from submitter with data-turbo-frame=_top"() {
    await this.clickSelector("#frame form[method=post] [type=submit][data-turbo-frame=_top]")
    await this.nextBody

    const title = await this.querySelector("h1")
    this.assert.notOk(await this.hasSelector("#forms"))
    this.assert.equal(await title.getVisibleText(), "One")
  }

  async "test frame form GET submission from submitter referencing another frame"() {
    await this.clickSelector("#frame form[method=get] [type=submit][data-turbo-frame=hello]")
    await this.nextBeat

    const title = await this.querySelector("#hello h2")
    this.assert.ok(await this.hasSelector("#forms"))
    this.assert.equal(await title.getVisibleText(), "Hello from a frame")
  }

  async "test frame form POST submission from submitter referencing another frame"() {
    await this.clickSelector("#frame form[method=post] [type=submit][data-turbo-frame=hello]")
    await this.nextBeat

    const title = await this.querySelector("#hello h2")
    this.assert.ok(await this.hasSelector("#forms"))
    this.assert.equal(await title.getVisibleText(), "Hello from a frame")
  }

  async "test frame form submission with redirect response"() {
    const button = await this.querySelector("#frame form.redirect input[type=submit]")
    await button.click()
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.ok(await this.hasSelector("#forms"))
    this.assert.notOk(await this.hasSelector("#frame form.redirect"))
    this.assert.equal(await message.getVisibleText(), "Frame redirected")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
  }

  async "test frame form submission with stream response"() {
    const button = await this.querySelector("#frame form.stream input[type=submit]")
    await button.click()
    await this.nextBeat

    const message = await this.querySelector("#frame div.message")
    this.assert.ok(await this.hasSelector("#forms"))
    this.assert.ok(await this.hasSelector("#frame form.redirect"))
    this.assert.equal(await message.getVisibleText(), "Hello!")
    this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html")
  }
}

FormSubmissionTests.registerSuite()
