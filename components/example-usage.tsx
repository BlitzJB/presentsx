'use client'

import React from 'react'
import { Sandbox } from './Sandbox'

const exampleComponentString = `
function ExampleComponent() {
  return (
    <div>
      <h1>Hello from dynamic component!</h1>
      <p>This component was rendered from a string.</p>
    </div>
  )
}
`

export function ExampleUsage() {
  return <Sandbox componentString={exampleComponentString} />
}
