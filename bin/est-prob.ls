opt =
  color:
    cyan      : '\033[0;36m'
    dark-gray : '\033[1;30m'
    light-red : '\033[1;31m'
    reset     : '\033[0m'
    yellow    : '\033[1;33m'
  confidence: 0.5
  probability: positive: 0.6
  progress: false
  support: 3

usr-opt = require \node-getopt .create [
  * [\c , \confidence=ARG , "set confidence (Float, default: #{opt.confidence})"]
  * [\h , \help           , 'show this help']
  * [\p , \progress       , 'show computing progress (default: false)']
  * [\r , \recall=ARG     , "set recall (Float, default: #{opt.probability.positive})"]
  * [\s , \support=ARG    , "set support (Interger, default: #{opt.support})"]
] .bind-help '\nUsage: lsc est-prob.ls\n[[OPTIONS]]\n' .parse-system!options

opt.confidence = parseFloat usr-opt.confidence if usr-opt.confidence
opt.probability.positive = parseFloat usr-opt.recall if usr-opt.recall
opt.probability.negative = 1 - opt.probability.positive
opt.progress = true if usr-opt.progress
opt.support = parseInt usr-opt.support if usr-opt.support

function C n, r
  return n if 1 is r

  (n / r) * C --n, --r

############################################

est-prob = 0
min-support = if ($1 = opt.support * opt.confidence) is ($2 = Math.ceil $1) and 0.5 is opt.confidence then ++$2 else $2

console.log "Estimate #{opt.color.light-red}support = #{opt.support}#{opt.color.reset}, #{opt.color.light-red}confidence = #{opt.confidence}#{opt.color.reset}, #{opt.color.light-red}recall = #{opt.probability.positive}#{opt.color.reset}\n===================================================="

for support from min-support to opt.support
  console.log "#{opt.color.dark-gray}Computing probability for support_#{opt.color.yellow}#support#{opt.color.dark-gray}...#{opt.color.reset}" if opt.progress
  est-prob += (C opt.support, support) * opt.probability.positive ** support * opt.probability.negative ** (opt.support - support)

console.log "====================================================\nOverall estimated probability is [#{opt.color.cyan}#{est-prob.to-fixed 6}#{opt.color.reset}]"
