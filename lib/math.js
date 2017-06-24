const samplePool = [] // samples in Gaussian distribution with mean = 0 and standard deviation = 1

module.exports = {
  generateGaussianSample: (mean, standardDeviation) => {

    // Implementation of the Marsaglia polar method, which is superior to the Box–Muller transform.

    if (samplePool.length) return mean + samplePool.pop() * standardDeviation

    let x = 0, y = 0, s = 0

    do {
      x = 2 * Math.random() - 1
      y = 2 * Math.random() - 1
    } while ((s = x * x + y * y) >= 1)

    s = Math.sqrt(-2 * Math.log(s) / s)

    samplePool.push(y * s)
    return mean + x * s * standardDeviation
  }
}
