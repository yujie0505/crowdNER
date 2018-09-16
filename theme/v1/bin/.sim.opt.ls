module.exports =
  NER:
    trivial-word-ratio: negative: 0.9345
    sim-category:
      * title: \precision_0.6474         TPR: { mean: 0.6000 std-dev: 0      } FPR: { mean: 0.3209 std-dev: 0      }
      * title: \no_expert                TPR: { mean: 0.6709 std-dev: 0.2707 } FPR: { mean: 0.3209 std-dev: 0.1639 }
      * title: \with_expert              TPR: { mean: 0.6848 std-dev: 0.2620 } FPR: { mean: 0.3029 std-dev: 0.1645 }
      * title: \no_expert.remove_outlier TPR: { mean: 0.7020 std-dev: 0.2404 } FPR: { mean: 0.3299 std-dev: 0.1652 }
      * title: \precision_0.6592         TPR: { mean: 0.6500 std-dev: 0      } FPR: { mean: 0.3299 std-dev: 0      }

  PPI:
    trivial-word-ratio: negative: 0.9345
    sim-category:
      * title: \precision_0.6474         TPR: { mean: 0.6000 std-dev: 0      } FPR: { mean: 0.3209 std-dev: 0      }
      * title: \precision_0.6592         TPR: { mean: 0.6500 std-dev: 0      } FPR: { mean: 0.3299 std-dev: 0      }
