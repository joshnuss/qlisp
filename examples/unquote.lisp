(define x 5)

; full form
(write (quasiquote (a (unquote x) c)))

; shorthand: ,
(write `(a ,x c))
