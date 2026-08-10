(define xs (list 1 2 3))

; full form
(write (quasiquote (a (unquote-splicing xs) b)))

; shorthand: ,@
(write `(a ,@xs b))
