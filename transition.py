import xlsxwriter

from monosyllable import *


class Text:
    text_string = ""
    cleaned_text_string = ""
    length = 0

    first_transition_map = {}
    cv1_count = {}
    total_first_order = 0

    second_transition_map = {}
    cv2_count = {}
    total_second_order = 0

    def __init__(self, path: str):
        self.read_text(path)
        self.clean()

    def __str__(self):
        return self.cleaned_text_string

    def read_text(self, path: str):
        file = open(path + '.txt', 'r', encoding='utf8')
        self.text_string = file.readlines()[0]
        file.close()

    def clean(self):
        global aksharas
        cleaned = ''.join([c for c in self.text_string if c in aksharas.keys()])
        self.cleaned_text_string = cleaned

    def insert_in_first_map(self, char):
        if char in self.first_transition_map:
            self.first_transition_map[char] += 1
        else:
            self.first_transition_map[char] = 1

    def count_cv1(self):
        for char, nxt in self.first_transition_map.keys():
            if char not in self.cv1_count.keys():
                val = 0
                for cv1, cv2 in self.first_transition_map.keys():
                    if cv1 == char:
                        val += self.first_transition_map[(cv1, cv2)]
                self.cv1_count[char] = val

    def write_first_order(self):
        count_first_order()
        self.count_cv1()
        self.total_first_order = sum(self.first_transition_map.values())
        self.first_transition_map = dict(sorted(self.first_transition_map.items(), key=lambda x: x[1], reverse=True))
        workbook = xlsxwriter.Workbook('mapped/first_order.xlsx')
        wk = workbook.add_worksheet('first_order')
        wk.write_row(0, 0, ('CV1', 'CV2', 'Freq', 'Prob', 'CV1 | CV2'))
        row = 1
        for each in self.first_transition_map:
            wk.write_row(row, 0, (each[0], each[1], self.first_transition_map[each],
                                  self.first_transition_map[each] / self.total_first_order,
                                  self.first_transition_map[each] / self.cv1_count[each[0]]))
            row += 1
        workbook.close()

    def insert_in_second_map(self, char):
        if char in self.second_transition_map:
            self.second_transition_map[char] += 1
        else:
            self.second_transition_map[char] = 1

    def count_cv2(self):
        for char, nxt, nxt_nxt in self.second_transition_map.keys():
            if (char, nxt) not in self.cv2_count.keys():
                val = 0
                for cv1, cv2, cv3 in self.second_transition_map.keys():
                    if (cv1, cv2) == (char, nxt):
                        val += self.second_transition_map[(cv1, cv2, cv3)]
                self.cv2_count[(char, nxt)] = val

    def write_second_order(self):
        count_second_order()
        self.count_cv2()
        self.total_second_order = sum(self.second_transition_map.values())
        self.second_transition_map = dict(sorted(self.second_transition_map.items(), key=lambda x: x[1], reverse=True))
        workbook = xlsxwriter.Workbook('mapped/second_order.xlsx')
        wk = workbook.add_worksheet('second_order')
        wk.write_row(0, 0, ('CV1', 'CV2', 'CV3', 'Freq', 'Prob', 'CV1 + CV2 | CV3'))
        row = 1
        for each in self.second_transition_map:
            wk.write_row(row, 0, (each[0], each[1], each[2], self.second_transition_map[each],
                                  self.second_transition_map[each] / self.total_second_order,
                                  self.second_transition_map[each] / self.cv2_count[(each[0], each[1])]))
            row += 1
        workbook.close()


def hi_syllables(word):
    signs = [u'\u0901', u'\u0902', u'\u0903', u'\u093c', u'\u093e', u'\u093f', u'\u0940',
             u'\u0941', u'\u0942', u'\u0943', u'\u0944', u'\u0946',
             u'\u0947', u'\u0948', u'\u094a', u'\u094b', u'\u094c',
             u'\u094d']
    syllables = []
    for char in word:
        if char in signs:
            syllables[-1] = syllables[-1] + char
        else:
            try:
                if '्' == syllables[-1][-1]:
                    syllables[-1] = syllables[-1] + char
                else:
                    syllables.append(char)
            except IndexError:
                syllables.append(char)
    return syllables


def count_first_order():
    spl = text.cleaned_text_string.split(" ")
    for i in spl:
        syllablify = hi_syllables(i)
        if len(syllablify) == 1:
            text.insert_in_first_map((syllablify[0], ''))
        else:
            for k in range(len(syllablify) - 1):
                curr_char = syllablify[k]
                next_char = syllablify[k + 1]
                text.insert_in_first_map((curr_char, next_char))


def count_second_order():
    spl = text.cleaned_text_string.split(" ")
    for i in spl:
        syllablify = hi_syllables(i)
        if len(syllablify) == 1:
            text.insert_in_second_map((syllablify[0], '', ''))
        elif len(syllablify) == 2:
            text.insert_in_second_map((syllablify[0], syllablify[1], ''))
        for k in range(len(syllablify) - 2):
            curr_char = syllablify[k]
            next_char = syllablify[k + 1]
            next_next_char = syllablify[k + 2]
            text.insert_in_second_map((curr_char, next_char, next_next_char))


if __name__ == '__main__':
    aksharas = read_aksharas('tamil_script_phonetic_data')
    aksharas.update({'ँ': Akshara('ँ', '901', '', 'anusvar', True)})
    aksharas.update({'ं': Akshara('ं', '902', '', 'anusvar', True)})
    text = Text('hi')
    text.write_first_order()
    text.write_second_order()
    # print(hi_syllables('उसी'))
