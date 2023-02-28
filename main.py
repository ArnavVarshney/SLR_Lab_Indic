# Hindi Characters (Unicode)
# vowels = '\u0904-\u0914\u0960-\u0961\u0972-\u0977'
# consonants = '\u0915-\u0939\u0958-\u095F\u0978-\u097C\u097E-\u097F'
# glottal = '\u097D'
# vowel_signs = '\u093E-\u094C\u093A-\u093B\u094E-\u094F\u0955-\u0957\u1CF8-\u1CF9'
# nasals = '\u0900-\u0902\u1CF2-\u1CF6'
# visarga = '\u0903'
# nukta = '\u093C'
# avagraha = '\u093D'
# virama = '\u094D'
# svirama = '\u094d'
# vedic_signs = '\u0951-\u0952\u1CD0-\u1CE1\u1CED'
# visarga_modifiers = '\u1CE2-\u1CE8'
# combining = '\uA8E0-\uA8F1'
# om = '\u0950'
# accents = '\u0953-\u0954'
# dandas = '\u0964-\u0965'
# digits = '\u0966-\u096F'
# abbreviation = '\u0970'
# spacing = '\u0971'
# vedic_nasals = '\uA8F2-\uA8F7\u1CE9-\u1CEC\u1CEE-\u1CF1'
# fillers = '\uA8F8-\uA8F9'
# caret = '\uA8FA'
# headstroke = '\uA8FB'
# space = '\u0020'
# joiners = '\u200C-\u200D'

"""Basic syllable counting through tokenisation

Splits text by limiters, and then separates by vowel/consonant.

Irrelevant now.

"""


def hi_syllables(text):
    signs = [u'\u0902', u'\u0903', u'\u093e', u'\u093f', u'\u0940',
             u'\u0941', u'\u0942', u'\u0943', u'\u0944', u'\u0946',
             u'\u0947', u'\u0948', u'\u094a', u'\u094b', u'\u094c',
             u'\u094d']
    limiters = ['.', '\"', '\'', '`', '!', ';', ', ', '?']
    syllables = []
    virama = '\u094D'
    for char in text:
        if char in limiters:
            syllables.append(char)
        elif char in signs:
            syllables[-1] = syllables[-1] + char
        else:
            try:
                if syllables[-1][-1] == virama:
                    syllables[-1] = syllables[-1] + char
                else:
                    syllables.append(char)
            except IndexError:
                syllables.append(char)

    return syllables


"""Generates a text file of all supposed monosyllabic words from the multi-column CSV supplied"""


def get_monosyl():
    monosyl = set({})
    import csv
    with open('monosyl_complete.csv', 'r', encoding='utf8') as ph_file:
        read = csv.reader(ph_file)
        for row in read:
            for i in row:
                monosyl.add(i)
        ph_file.close()

    monosyl_sorted = sorted(monosyl)
    with open('monosyl_complete.txt', 'w', encoding='utf8') as file:
        for i in monosyl_sorted:
            file.write(i + '\n')
        file.close()


"""Reads Consonant/Vowel type assignment from the CSV database"""


def get_cv():
    global cv_map
    import csv
    with open('tamil_script_phonetic_data.csv', 'r', encoding='utf8') as ph_file:
        read = csv.reader(ph_file)
        for row in read:
            if row[6] == '1' or row[7] == '1':
                if row[6] == '1':
                    cv_map[row[2]] = 'V'
                elif row[7] == '1':
                    cv_map[row[2]] = 'C'
        ph_file.close()
    cv_map[' '] = ' '


"""Generates the CV structure for each word in the corpus / or a single custom word supplied"""


def call_classify_cv(custom_word=''):
    if custom_word != '':
        print(classify_cv(custom_word))
    else:
        monosyl = open('monosyl_complete.txt', 'r', encoding='utf8')
        for word in monosyl:
            struct = classify_cv(word[:-1])
            if struct in struct_map.keys():
                struct_map[struct].append(word)
            else:
                struct_map[struct] = [word]


"""Generates the CV structure the given word"""


def classify_cv(word):
    global cv_map
    struct = ''
    word += ' '
    for i in range(len(word) - 1):
        curr_char = word[i]
        next_char = word[i + 1]
        print(curr_char, end=' ')
        if curr_char in cv_map.keys():
            ident = cv_map[curr_char]
            print(ident, end=' ')
            struct += ident
            if next_char in cv_map.keys():
                if cv_map[curr_char] != 'V' and cv_map[next_char] != 'V' and next_char != '्' \
                        and next_char != ' ' or len(word) == 2:
                    print('V', end=' ')
                    struct += 'V'
            if next_char == '़':
                print('V', end=' ')
                struct += 'V'
        print()
    return struct


"""Writes all the classified structures into their respective text files"""


def sort_write_cv():
    import glob
    import os

    global struct_map
    if len(struct_map) == 0:
        return
    files = glob.glob('mapped/*')
    for f in files:
        os.remove(f)
    for struct in struct_map.keys():
        # print(f'Writing {struct}')
        file = open('mapped/' + struct + '.txt', 'w', encoding='utf8')
        for word in struct_map[struct]:
            file.write(word)
        file.close()


"""Prints out the structure-wise distribution of the corpus"""


def struct_stats():
    global struct_map
    if len(struct_map) == 0:
        return
    total_elems = 0
    count = 1
    keys = sorted(struct_map.keys())
    file = open('mapped/stats.txt', 'w')
    for struct in keys:
        elems = len(struct_map[struct])
        total_elems += elems
        print(f"{str(count) + '.':<4}{struct:<8}{elems:<4}", file=file)
        count += 1
    print(f"{'Total':<12}{total_elems:<4}", file=file)


if __name__ == "__main__":
    cv_map = {}
    struct_map = {}
    get_monosyl()
    get_cv()
    call_classify_cv()
    # call_classify_cv('नृत्य')
    sort_write_cv()
    struct_stats()
