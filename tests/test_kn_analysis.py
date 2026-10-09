from collections import Counter

import pytest

from kn_analysis import akshara_features, normalise, syllabify


@pytest.mark.parametrize(
    "word, expected",
    [
        ("ಕಾರ್ಯಕ್ರಮ", ["ಕಾ", "ರ್ಯ", "ಕ್ರ", "ಮ"]),  # conjuncts
        ("ಅಮ್ಮ", ["ಅ", "ಮ್ಮ"]),  # geminate, coda written on next akshara
        ("ಎಂದು", ["ಎಂ", "ದು"]),  # anusvara attaches to preceding akshara
        ("ದುಃಖ", ["ದುಃ", "ಖ"]),  # visarga
        ("ಸ್ತ್ರೀ", ["ಸ್ತ್ರೀ"]),  # three-consonant cluster
        ("ಪ್ರೊಟೀನ್‌ಗಳು", ["ಪ್ರೊ", "ಟೀ", "ನ್", "ಗ", "ಳು"]),  # ZWNJ dead consonant
        ("ಪ್ರೊಟೀನ್ಗಳು", ["ಪ್ರೊ", "ಟೀ", "ನ್ಗ", "ಳು"]),  # without ZWNJ -> conjunct
        ("ಬಸ್", ["ಬ", "ಸ್"]),  # word-final dead consonant
        ("ಆಆ", ["ಆ", "ಆ"]),  # independent vowels
    ],
)
def test_syllabify(word, expected):
    assert syllabify(normalise(word)) == expected


def test_orphan_signs_are_dropped_and_counted():
    orphans = Counter()
    assert syllabify("ಾಕ", orphans) == ["ಕ"]
    assert orphans == {"ಾ": 1}


def test_normalise_strips_non_kannada_and_keeps_zwnj():
    assert normalise("ಮನೆ, home!\u200dಕ\u200c").split() == ["ಮನೆ", "ಕ\u200c"]
    # decomposed ೀ (ಿ + ೕ) composes to U+0CC0
    assert normalise("ಕೀ") == "ಕೀ"


@pytest.mark.parametrize(
    "ak, structure, cluster, vowel_kind, visual",
    [
        ("ಕ", "CV", "none", "inherent", 1),
        ("ಕಾ", "CV", "none", "matra", 2),
        ("ಅ", "V", "none", "independent", 1),
        ("ಎಂ", "VN", "none", "independent", 2),
        ("ದುಃ", "CVH", "none", "matra", 3),
        ("ಮ್ಮ", "CCV", "geminate", "inherent", 2),
        ("ಕ್ರ", "CCV", "non_geminate", "inherent", 2),
        ("ತ್ತ್ರ", "CCCV", "geminate+other", "inherent", 3),
        ("ನ್", "C(dead)", "none", "dead", 2),
        ("ಸ್ತ್ರೀ", "CCCV", "non_geminate", "matra", 4),
    ],
)
def test_akshara_features(ak, structure, cluster, vowel_kind, visual):
    f = akshara_features(ak)
    assert (f["structure"], f["cluster_type"], f["vowel_kind"], f["visual_components"]) == (
        structure, cluster, vowel_kind, visual)
