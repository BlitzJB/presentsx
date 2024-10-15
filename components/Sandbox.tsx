'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo, useContext, useReducer, useLayoutEffect } from 'react'
import { transform } from '@babel/standalone'
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform, useSpring, useScroll, useInView } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter, Cell, Sector } from 'recharts'
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live'
import { useSpring as useSpringReactSpring, animated } from 'react-spring'
import { Transition } from 'react-transition-group'
import { useForm, Controller } from 'react-hook-form'
import { format, parseISO, differenceInDays } from 'date-fns'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import * as d3 from 'd3'
import * as THREE from 'three'
import anime from 'animejs'

const ReactUtils = {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useContext,
  useReducer,
  useLayoutEffect,
}

const FramerMotionUtils = {
  motion,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useTransform,
  useSpring,
  useScroll,
  useInView,
}

const RechartsUtils = {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  Cell,
  Sector,
}

const ReactLiveUtils = {
  LiveProvider,
  LiveEditor,
  LiveError,
  LivePreview,
}

const ReactSpringUtils = {
  useSpring: useSpringReactSpring,
  animated,
}

const ReactTransitionGroupUtils = {
  Transition,
}

const ReactHookFormUtils = {
  useForm,
  Controller,
}

const DateFnsUtils = {
  format,
  parseISO,
  differenceInDays,
}

const ReactLeafletUtils = {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
}

const D3Utils = {
  ...d3,
}

const ThreeJSUtils = {
  ...THREE,
}

const AnimeJSUtils = {
  anime,
}

type SandboxProps = {
  componentString: string
}

export function Sandbox({ componentString }: SandboxProps) {
  const [error, setError] = useState<Error | null>(null)
  const [Component, setComponent] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    try {
      // Wrap the component string in a module-like structure
      const wrappedCode = `
        (function(React, ReactUtils, FramerMotionUtils, RechartsUtils, ReactLiveUtils, ReactSpringUtils, ReactTransitionGroupUtils, ReactHookFormUtils, DateFnsUtils, ReactLeafletUtils, D3Utils, ThreeJSUtils, AnimeJSUtils) {
          const { useState, useEffect, useRef, useCallback, useMemo, useContext, useReducer, useLayoutEffect } = ReactUtils;
          const { motion, AnimatePresence, useAnimation, useMotionValue, useTransform, useSpring, useScroll, useInView } = FramerMotionUtils;
          const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter, Cell, Sector } = RechartsUtils;
          const { LiveProvider, LiveEditor, LiveError, LivePreview } = ReactLiveUtils;
          const { useSpring: useSpringReactSpring, animated } = ReactSpringUtils;
          const { Transition } = ReactTransitionGroupUtils;
          const { useForm, Controller } = ReactHookFormUtils;
          const { format, parseISO, differenceInDays } = DateFnsUtils;
          const { MapContainer, TileLayer, Marker, Popup } = ReactLeafletUtils;
          const d3 = D3Utils;
          const THREE = ThreeJSUtils;
          const anime = AnimeJSUtils.anime;
          ${componentString}
          return Component;
        })
      `

      // Transform the string to valid JavaScript
      const { code } = transform(wrappedCode, {
        presets: ['react'],
      })

      // Create a function from the transformed code
      const ComponentFunction = eval(code || '')

      // Execute the function to get the component
      const result = ComponentFunction(React, ReactUtils, FramerMotionUtils, RechartsUtils, ReactLiveUtils, ReactSpringUtils, ReactTransitionGroupUtils, ReactHookFormUtils, DateFnsUtils, ReactLeafletUtils, D3Utils, ThreeJSUtils, AnimeJSUtils)
      
      if (typeof result !== 'function') {
        console.error('Component result:', result)
        throw new Error(`Component must be a function, got ${typeof result}`)
      }

      setComponent(() => result)
    } catch (err) {
      console.error('Full error:', err)
      setError(err instanceof Error ? err : new Error('Failed to compile component'))
    }
  }, [componentString])

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      event.preventDefault()
      console.error('Runtime error:', event.error)
      setError(event.error)
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <h3 className="font-bold">Error in sandboxed component:</h3>
        <p>{error.message}</p>
        <pre className="mt-2 text-sm">{error.stack}</pre>
      </div>
    )
  }

  return (
    <div className="sandbox h-full">
      <React.Suspense fallback={<div>Loading...</div>}>
        {/* 
        // @ts-ignore */}
        {Component && <Component 
          {...ReactUtils} 
          {...FramerMotionUtils} 
          {...RechartsUtils} 
          {...ReactLiveUtils} 
          {...ReactSpringUtils} 
          {...ReactTransitionGroupUtils} 
          {...ReactHookFormUtils} 
          {...DateFnsUtils} 
          {...ReactLeafletUtils} 
          {...D3Utils} 
          {...ThreeJSUtils} 
          {...AnimeJSUtils} 
        />}
      </React.Suspense>
    </div>
  )
}
