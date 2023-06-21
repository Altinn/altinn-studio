import { useEffect, useRef } from 'react'

/**
 * Hook that calls a provided callback exactly once upon rendering the component
 *
 * @param callback function that should be called on first render
 * @param condition a boolean that must be true before the callback is called
 */
export const useOnce = (callback: () => void, condition: boolean = true) => {
	const calledRef = useRef(false)
	const conditionRef = useRef(false)

	// Ensure we cannot set condition to false again
	useEffect(() => {
		if (!conditionRef.current && condition) conditionRef.current = condition
	}, [condition])

	useEffect(() => {
		if (!conditionRef.current || calledRef.current) return
		callback()
		calledRef.current = true
	}, [callback, condition])
}
