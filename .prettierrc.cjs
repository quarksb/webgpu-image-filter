module.exports = {
    bracketSpacing: true,
    // 超过100换行
    printWidth: 150,
    // 使用tab缩进
    tabWidth: 4,
    // 结尾使用分号
    semi: true,
    // 尾随逗号的使用方式："none" - 不使用尾随逗号，"es5" - 在 ES5 中有效的地方使用尾随逗号，"all" - 在可能的地方都使用尾随逗号
    trailingComma: "none",
    // 换行,always：超过printWidth就换行，never：不换行，preserve：按照原样处理
    proseWrap: "never",
    // html中的空格敏感性:"css"- 遵守CSS display属性的默认值;"strict" - 空格被认为是敏感的;"ignore" - 空格被认为是不敏感的
    htmlWhitespaceSensitivity: "ignore",
    // 行尾换行格式
    endOfLine: "auto",
    // 箭头函数参数允许没有括号
    arrowParens: "avoid",
    // 为不同文件类型设置不同的缩进规则
    overrides: [
        {
            files: ["*.vue", "*.json", "*.jsonc"],
            options: {
                tabWidth: 2
            }
        },
        {
            files: ["*.ts", "*.tsx"],
            options: {
                tabWidth: 4
            }
        },
        {
            files: ["*.md"],
            options: {
                tabWidth: 2,
                printWidth: 100,
                // 保持原有换行，避免破坏文档结构
                proseWrap: "preserve",
                // 保持代码块内容不被格式化
                embeddedLanguageFormatting: "off"
            }
        }
    ]
};
