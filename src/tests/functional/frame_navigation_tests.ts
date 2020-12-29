import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case"

export class FrameNavigationTests extends TurboDriveTestCase {
  async setup() {
    await this.goToLocation("/src/tests/fixtures/frame_navigation.html")
  }

  async "test frame navigation with descendant link"() {
    this.trackFrameEvents()
    await this.clickSelector("#inside")
    await this.nextBeat

    const dispatchedEvents = await this.readDispatchedFrameEvents()
    const [
      [ beforeVisit, beforeVisitTarget, { url } ],
      [ visit, visitTarget ],
      [ beforeRender, beforeRenderTarget, { newBody } ],
      [ render, renderTarget ],
      [ load, loadTarget, { timing } ],
    ] = dispatchedEvents

    this.assert.equal(beforeVisit, "turbo:before-visit")
    this.assert.equal(beforeVisitTarget, "frame")
    this.assert.ok(url.includes("/src/tests/fixtures/frame_navigation.html"))

    this.assert.equal(visit, "turbo:visit")
    this.assert.equal(visitTarget, "frame")

    this.assert.equal(beforeRender, "turbo:before-render")
    this.assert.equal(beforeRenderTarget, "frame")
    this.assert.ok(newBody)

    this.assert.equal(render, "turbo:render")
    this.assert.equal(renderTarget, "frame")

    this.assert.equal(load, "turbo:load")
    this.assert.equal(loadTarget, "frame")
    this.assert.ok(Object.keys(timing).length)
  }

  async "test frame navigation with exterior link"() {
    this.trackFrameEvents()
    await this.clickSelector("#outside")
    await this.nextBeat

    const dispatchedEvents = await this.readDispatchedFrameEvents()
    const [
      [ beforeVisit, beforeVisitTarget, { url } ],
      [ visit, visitTarget ],
      [ beforeRender, beforeRenderTarget, { newBody } ],
      [ render, renderTarget ],
      [ load, loadTarget, { timing } ],
    ] = dispatchedEvents

    this.assert.equal(beforeVisit, "turbo:before-visit")
    this.assert.equal(beforeVisitTarget, "frame")
    this.assert.ok(url.includes("/src/tests/fixtures/frame_navigation.html"))

    this.assert.equal(visit, "turbo:visit")
    this.assert.equal(visitTarget, "frame")

    this.assert.equal(beforeRender, "turbo:before-render")
    this.assert.equal(beforeRenderTarget, "frame")
    this.assert.ok(newBody)

    this.assert.equal(render, "turbo:render")
    this.assert.equal(renderTarget, "frame")

    this.assert.equal(load, "turbo:load")
    this.assert.equal(loadTarget, "frame")
    this.assert.ok(Object.keys(timing).length)
  }

  async trackFrameEvents() {
    this.remote.execute(() => {
      const eventNames = "turbo:before-visit turbo:visit turbo:before-render turbo:render turbo:load".split(/\s+/)
      document.head.insertAdjacentHTML("beforeend", `<meta id="events" content="[]">`)
      const frame = document.getElementById("frame")

      if (frame) {
        eventNames.forEach(eventName => frame.addEventListener(eventName, (event) => {
          const meta = document.getElementById("events")

          if (meta instanceof HTMLMetaElement && event instanceof CustomEvent && event.target instanceof HTMLElement) {
            const dispatchedEvents = JSON.parse(meta.content)
            const detail = event.detail || {}
            dispatchedEvents.push([ event.type, event.target.id, { ...detail, newBody: !!detail.newBody } ])
            meta.content = JSON.stringify(dispatchedEvents)
          }
        }))
      }
    })
  }

  async readDispatchedFrameEvents() {
    const meta = await this.querySelector("meta[id=events]")
    const content = await meta.getAttribute("content")

    return JSON.parse(content || "[]")
  }
}

FrameNavigationTests.registerSuite()
