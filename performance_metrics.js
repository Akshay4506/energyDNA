/**
 * ⚡ EnergyDNA: High-Resolution Performance Benchmarking ⚡
 * This script measures real-time metrics for energy tokenization processing,
 * including data ingestion, matching logic, and simulated infrastructure latencies.
 * 
 * Usage: node performance_metrics.js
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Configuration
const DATASET_PATH = path.join(__dirname, 'dataset', 'T1.csv');
const ITERATIONS = 5;
const SIMULATED_MINT_DELAY_MIN = 200; // ms
const SIMULATED_MINT_DELAY_MAX = 500; // ms
const SIMULATED_DB_SYNC_DELAY_MIN = 10; // ms
const SIMULATED_DB_SYNC_DELAY_MAX = 30; // ms

/**
 * Helper to generate random delays for simulation
 */
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * A. DATASET LOAD MEASUREMENT
 */
function measureDataLoad() {
    const latencies = [];
    for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        const data = fs.readFileSync(DATASET_PATH, 'utf-8');
        const rows = data.split('\n').filter(line => line.trim() !== '');
        const end = performance.now();
        latencies.push(end - start);
    }
    return latencies;
}

/**
 * B. MATCHING TIME MEASUREMENT
 */
function measureMatching(rows) {
    const latencies = [];
    const targetEnergy = Math.random() * 800; // Random demand between 0 and 800 kW

    for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        
        let bestMatch = null;
        let minDiff = Infinity;

        // Skip header row
        for (let j = 1; j < rows.length; j++) {
            const cols = rows[j].split(',');
            const power = parseFloat(cols[1]); // LV ActivePower (kW)
            if (isNaN(power)) continue;

            const diff = Math.abs(power - targetEnergy);
            if (diff < minDiff) {
                minDiff = diff;
                bestMatch = rows[j];
            }
        }

        const end = performance.now();
        latencies.push(end - start);
    }
    return latencies;
}

/**
 * C. BLOCKCHAIN MINTING SIMULATION (ASYNC)
 */
async function measureMinting() {
    const latencies = [];
    for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        
        // Simulate contract.mintEnergyToken(...)
        const delay = randomDelay(SIMULATED_MINT_DELAY_MIN, SIMULATED_MINT_DELAY_MAX);
        await sleep(delay);
        
        const end = performance.now();
        latencies.push(end - start);
    }
    return latencies;
}

/**
 * D. DATABASE SYNC SIMULATION (ASYNC)
 */
async function measureDbSync() {
    const latencies = [];
    for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        
        // Simulate Mongoose save()
        const delay = randomDelay(SIMULATED_DB_SYNC_DELAY_MIN, SIMULATED_DB_SYNC_DELAY_MAX);
        await sleep(delay);
        
        const end = performance.now();
        latencies.push(end - start);
    }
    return latencies;
}

/**
 * Format and print the results
 */
function printResults(label, latencies) {
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const peak = Math.max(...latencies);

    console.log(`${label}:`);
    console.log(`Avg: ${avg.toFixed(3)} ms`);
    console.log(`Peak: ${peak.toFixed(3)} ms\n`);
}

/**
 * Main execution flow
 */
async function runBenchmarking() {
    console.log('----------------------------------');
    console.log('ENERGYDNA PERFORMANCE METRICS');
    console.log('----------------------------------');

    try {
        // Measure Data Loading
        const loadLatencies = measureDataLoad();
        printResults('Dataset Load', loadLatencies);

        // Pre-parse rows for the matching test
        const rawContent = fs.readFileSync(DATASET_PATH, 'utf-8');
        const rows = rawContent.split('\n');

        // Measure Matching
        const matchLatencies = measureMatching(rows);
        printResults('Matching', matchLatencies);

        // Measure Minting
        const mintLatencies = await measureMinting();
        printResults('Minting', mintLatencies);

        // Measure DB Sync
        const dbLatencies = await measureDbSync();
        printResults('DB Sync', dbLatencies);

        console.log('----------------------------------');
    } catch (error) {
        console.error('Benchmarking failure:', error.message);
    }
}

// Execute the benchmark
runBenchmarking();
