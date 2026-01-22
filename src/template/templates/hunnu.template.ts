// HUNNU Bachelor Thesis Template
// 湖南师范大学树达学院本科毕业论文 LaTeX 模板

export const hunnuTemplate = {
  id: 'hunnu',
  schoolId: 'hunnu',
  name: '湖南师范大学本科毕业论文',
  description: '湖南师范大学树达学院本科毕业论文 LaTeX 模板',
  requiredFields: [
    'title',
    'titleEn',
    'author',
    'major',
    'advisor',
    'college',
    'studentId',
  ],
  requiredSections: [
    'abstractCn',
    'abstractEn',
    'chapters',
  ],
  assets: [
    'HUNNUthesis.cls',
    'HUNNU.cfg',
    'hunnubib.bst',
    'figures/hunnu.bmp',
    'kaiti_GB2312.TTF',
    'simsun.ttc',
    'simhei.ttf',
    'simfang.ttf',
  ],
  texContent: `% !TEX TS-program = xelatex
% !TEX encoding = UTF-8
%%
%% 湖南师范大学树达学院本科毕业论文 LaTeX 模板
%% HUNNU Bachelor Thesis Template - Auto-generated with Mustache placeholders
%%
\\documentclass{HUNNUthesis}
\\graphicspath{{figures/}}
\\setboolean{PicAndTabIndex}{false}

%% ==================== 额外宏包 ====================
\\usepackage{amsthm}
\\usepackage{longtable}

%% ==================== 封面信息 ====================
% 中文标题 - 支持多行格式 {{第一行}{第二行}}
\\title{ {{#title}}{ {{title}} }{{/title}}{{^title}}{{论文题目}}{{/title}} }
% 英文标题
\\entitle{ {{#titleEn}}{ {{titleEn}} }{{/titleEn}}{{^titleEn}}{English Title}{{/titleEn}} }
% 作者姓名
\\author{ {{#author}}{{author}}{{/author}}{{^author}}作者姓名{{/author}} }
% 英文作者姓名
\\enauthor{ {{#authorEn}}{{authorEn}}{{/authorEn}}{{^authorEn}}Author Name{{/authorEn}} }
% 专业班级
\\major{ {{#major}}{{major}}{{/major}}{{^major}}专业名称~~20XX级{{/major}} }
% 英文专业
\\enmajor{ {{#majorEn}}{{majorEn}}{{/majorEn}}{{^majorEn}}Major Name 20XX{{/majorEn}} }
% 指导教师
\\advisor{ {{#advisor}}{{advisor}}{{/advisor}}{{^advisor}}指导教师{{/advisor}} }
% 学院
\\college{ {{#college}}{{college}}{{/college}}{{^college}}学院名称{{/college}} }
% 学号
\\serialnumber{ {{#studentId}}{{studentId}}{{/studentId}}{{^studentId}}20XXXXXXXXXX{{/studentId}} }
% 专业代码
\\code{ {{#code}}{{code}}{{/code}}{{^code}}000000{{/code}} }
% 提交年份（中文数字，如：二六）
\\submityear{ {{#submitYear}}{{submitYear}}{{/submitYear}}{{^submitYear}}二六{{/submitYear}} }
% 提交月份（中文数字，如：一）
\\submitmonth{ {{#submitMonth}}{{submitMonth}}{{/submitMonth}}{{^submitMonth}}六{{/submitMonth}} }

\\begin{document}

%% ==================== 封面 ====================
\\maketitle

%% ==================== 诚信声明 ====================
\\begin{center}
\\heiti\\zihao{-2}湖南师范大学树达学院本科毕业设计诚信声明
\\end{center}
\\vspace{1cm}

\\fangsong\\zihao{4}本人郑重声明：所呈交的本科毕业论文，是本人在指导老师的指导下，独立进行研究工作所取得的成果，成果不存在知识产权争议，除文中已经注明引用的内容外，本设计不含任何其他个人或集体已经发表或撰写过的作品成果。对本设计的研究做出重要贡献的个人和集体均已在文中以明确方式标明。本人完全意识到本声明的法律结果由本人承担。\\vspace{9cm}

\\begin{flushright}
本科毕业设计作者签名：\\qquad\\qquad\\qquad\\vspace{0.25cm}

二〇{{#submitYear}}{{submitYear}}{{/submitYear}}{{^submitYear}}二六{{/submitYear}}\\quad 年\\quad 月\\quad 日\\quad\\qquad
\\end{flushright}

\\cleardoublepage

%% ==================== 前言部分 ====================
\\frontmatter
\\tableofcontents

%% ==================== 正文部分 ====================
\\mainmatter

%% ==================== 中文摘要 ====================
\\ZhAbstract{%
{{#abstractCn}}{{{abstractCn}}}{{/abstractCn}}{{^abstractCn}}{{{abstract}}}{{/abstractCn}}
}{%
{{#keywordsCn}}{{keywordsCn}}{{/keywordsCn}}{{^keywordsCn}}{{keywords}}{{/keywordsCn}}
}

%% ==================== 英文摘要 ====================
\\EnAbstract{%
{{#abstractEn}}{{{abstractEn}}}{{/abstractEn}}{{^abstractEn}}{{{abstract_en}}}{{/abstractEn}}
}{%
{{#keywordsEn}}{{keywordsEn}}{{/keywordsEn}}{{^keywordsEn}}{{keywords_en}}{{/keywordsEn}}
}

\\fangsong\\zihao{4}

%% ==================== 正文章节 ====================
{{#chapters}}
{{#isLevel1}}
\\chapter{ {{title}} }
{{/isLevel1}}
{{#isLevel2}}
\\section{ {{title}} }
{{/isLevel2}}
{{#isLevel3}}
\\subsection{ {{title}} }
{{/isLevel3}}
{{#isLevel4}}
\\subsubsection{ {{title}} }
{{/isLevel4}}

{{{content}}}

{{/chapters}}
{{^chapters}}
{{#sections}}
{{#isLevel1}}
\\chapter{ {{title}} }
{{/isLevel1}}
{{#isLevel2}}
\\section{ {{title}} }
{{/isLevel2}}
{{#isLevel3}}
\\subsection{ {{title}} }
{{/isLevel3}}
{{#isLevel4}}
\\subsubsection{ {{title}} }
{{/isLevel4}}

{{{content}}}

{{/sections}}
{{/chapters}}

%% ==================== 结论 ====================
{{#hasConclusion}}
\\chapter*{结论}
\\addcontentsline{toc}{chapter}{结论}

{{{conclusion}}}

{{/hasConclusion}}

%% ==================== 后文部分 ====================
\\backmatter

%% ==================== 参考文献 ====================
{{#hasReferences}}
\\fangsong\\zihao{4}
\\addcontentsline{toc}{chapter}{参考文献}
\\begin{thebibliography}{99}
{{#references}}
\\bibitem{ {{key}} }
{{{citation}}}
{{/references}}
\\end{thebibliography}
{{/hasReferences}}

%% ==================== 致谢 ====================
{{#hasAcknowledgements}}
\\chapter*{致谢}
\\addcontentsline{toc}{chapter}{致谢}

{{{acknowledgements}}}

{{/hasAcknowledgements}}

%% ==================== 附录 ====================
{{#hasAppendix}}
\\appendix

{{{appendix}}}

{{/hasAppendix}}

\\end{document}
`,
};
