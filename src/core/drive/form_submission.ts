import { FetchRequest, FetchMethod, fetchMethodFromString, FetchRequestHeaders } from "../../http/fetch_request"
import { FetchResponse } from "../../http/fetch_response"
import { Location } from "../location"
import { dispatch } from "../../util"

export interface FormSubmissionDelegate {
  formSubmissionStarted(formSubmission: FormSubmission): void
  formSubmissionSucceededWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): void
  formSubmissionErrored(formSubmission: FormSubmission, error: Error): void
  formSubmissionFinished(formSubmission: FormSubmission): void
  additionalHeadersForRequest?(request: FetchRequest): { [header: string]: string }
}

export type FormSubmissionResult
  = { success: boolean, fetchResponse: FetchResponse }
  | { success: false, error: Error }

export enum FormSubmissionState {
  initialized,
  requesting,
  waiting,
  receiving,
  stopping,
  stopped,
}

export class FormSubmission {
  readonly delegate: FormSubmissionDelegate
  readonly formElement: HTMLFormElement
  readonly submitter?: HTMLElement
  readonly formData: FormData
  readonly fetchRequest: FetchRequest
  readonly mustRedirect: boolean
  state = FormSubmissionState.initialized
  result?: FormSubmissionResult

  constructor(delegate: FormSubmissionDelegate, formElement: HTMLFormElement, submitter?: HTMLElement, mustRedirect = false) {
    this.delegate = delegate
    this.formElement = formElement
    this.formData = buildFormData(formElement, submitter)
    this.submitter = submitter
    this.fetchRequest = new FetchRequest(this, this.method, this.location, this.formData)
    this.mustRedirect = mustRedirect
  }

  get method(): FetchMethod {
    const method = this.submitter?.getAttribute("formmethod") || this.formElement.getAttribute("method") || ""
    return fetchMethodFromString(method.toLowerCase()) || FetchMethod.get
  }

  get action(): string {
    return this.submitter?.getAttribute("formaction") || this.formElement.action
  }

  get location() {
    return Location.wrap(this.action)
  }

  // The submission process

  async start() {
    const { initialized, requesting } = FormSubmissionState
    if (this.state == initialized) {
      this.state = requesting
      return this.fetchRequest.perform()
    }
  }

  stop() {
    const { stopping, stopped } = FormSubmissionState
    if (this.state != stopping && this.state != stopped) {
      this.state = stopping
      this.fetchRequest.cancel()
      return true
    }
  }

  // Fetch request delegate

  additionalHeadersForRequest(request: FetchRequest) {
    const headers: FetchRequestHeaders = this.delegateHeadersForRequest(request)
    if (this.method != FetchMethod.get) {
      const token = getCookieValue(getMetaContent("csrf-param")) || getMetaContent("csrf-token")
      if (token) {
        headers["X-CSRF-Token"] = token
      }
    }
    return headers
  }

  delegateHeadersForRequest(request: FetchRequest) {
    if (typeof this.delegate.additionalHeadersForRequest == "function") {
      return this.delegate.additionalHeadersForRequest(request)
    } else {
      return {}
    }
  }

  requestStarted(request: FetchRequest) {
    this.state = FormSubmissionState.waiting
    dispatch("turbo:submit-start", { target: this.formElement, detail: { formSubmission: this } })
    this.delegate.formSubmissionStarted(this)
  }

  requestPreventedHandlingResponse(request: FetchRequest, response: FetchResponse) {
    this.result = { success: response.succeeded, fetchResponse: response }
  }

  requestSucceededWithResponse(request: FetchRequest, response: FetchResponse) {
    if (response.clientError || response.serverError) {
      this.delegate.formSubmissionFailedWithResponse(this, response)
    } else if (this.requestMustRedirect(request) && responseSucceededWithoutRedirect(response)) {
      const error = new Error("Form responses must redirect to another location")
      this.delegate.formSubmissionErrored(this, error)
    } else {
      this.state = FormSubmissionState.receiving
      this.result = { success: true, fetchResponse: response }
      this.delegate.formSubmissionSucceededWithResponse(this, response)
    }
  }

  requestFailedWithResponse(request: FetchRequest, response: FetchResponse) {
    this.result = { success: false, fetchResponse: response }
    this.delegate.formSubmissionFailedWithResponse(this, response)
  }

  requestErrored(request: FetchRequest, error: Error) {
    this.result = { success: false, error }
    this.delegate.formSubmissionErrored(this, error)
  }

  requestFinished(request: FetchRequest) {
    this.state = FormSubmissionState.stopped
    dispatch("turbo:submit-end", { target: this.formElement, detail: { formSubmission: this, ...this.result }})
    this.delegate.formSubmissionFinished(this)
  }

  requestMustRedirect(request: FetchRequest) {
    return !request.isIdempotent && this.mustRedirect
  }
}

function buildFormData(formElement: HTMLFormElement, submitter?: HTMLElement): FormData {
  const formData = new FormData(formElement)
  const name = submitter?.getAttribute("name")
  const value = submitter?.getAttribute("value")

  if (name && formData.get(name) != value) {
    formData.append(name, value || "")
  }

  return formData
}

function getCookieValue(cookieName: string | null) {
  if (cookieName != null) {
    const cookies = document.cookie ? document.cookie.split("; ") : []
    const cookie = cookies.find((cookie) => cookie.startsWith(cookieName))
    if (cookie) {
      const value = cookie.split("=").slice(1).join("=")
      return value ? decodeURIComponent(value) : undefined
    }
  }
}

function getMetaContent(name: string) {
  const element: HTMLMetaElement | null = document.querySelector(`meta[name="${name}"]`)
  return element && element.content
}

function responseSucceededWithoutRedirect(response: FetchResponse) {
  return response.statusCode == 200 && !response.redirected
}
