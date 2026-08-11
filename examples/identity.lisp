; identity is defined in src/stdlib.lisp
(print (identity 42))
(print (identity "hello"))

; useful as a no-op default passed to higher-order functions
(print (map (lambda (x) (identity x)) (list 1 2 3)))
