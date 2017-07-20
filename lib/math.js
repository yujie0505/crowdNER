const samplePool = [] // samples in Gaussian distribution with mean = 0 and standard deviation = 1

module.exports = {
  chooseWeighted: (choices, weights) => {
    const choicePool = []
    for (let [choiceId, choice] of choices.entries())
      for (let w = 0; w < weights[choiceId]; w++)
        choicePool.push(choice)
    return () => choicePool[Math.floor(Math.random() * choicePool.length)]
  },
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
  },
  linearInterpolation: (min, max, interval) => {
    let delta = (max - min) / interval
    let values = []

    for (let i = 0; i <= interval; i++)
      values.push(min + i * delta)

    return values
  },
  mean: data => data.reduce((sum, value) => { return sum + value }, 0) / data.length,
  standardDeviation: (data, mean) => Math.sqrt(data.reduce((deviation, datum) => { return deviation + Math.pow((datum - mean), 2) }, 0) / data.length)
}
