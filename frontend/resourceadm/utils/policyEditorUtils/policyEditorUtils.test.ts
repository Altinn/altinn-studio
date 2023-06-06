import { subjectStringBackendMock1, subjectStringBackendMock3, subjectsListMock } from "resourceadm/data-mocks/policies"
import { mapPolicySubjectToSubjectTitle } from "./policyEditorUtils"

// TODO - add more
describe('mapPolicySubjectToSubjectTitle', () => {
  it('should ', () => {

    const subjects = [subjectStringBackendMock1, subjectStringBackendMock3]
    const result = mapPolicySubjectToSubjectTitle(subjectsListMock, subjects)

    const resultIncludes = result.includes("Daglig leder")

    expect(resultIncludes).toBe(true)
  })
})
