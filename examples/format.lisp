; format returns a formatted string; it doesn't print anything itself
(print (format "~a is ~a years old" "Ada" 30))

; ~a inserts strings unquoted, unlike write/print
(print (format "hello, ~a!" "world"))

; ~% inserts a newline, ~~ inserts a literal tilde
(print (format "line1~%line2"))
(print (format "100~~ done"))

; non-string values are inserted the same way print/write display them
(print (format "the list is ~a" (list 1 2 3)))
