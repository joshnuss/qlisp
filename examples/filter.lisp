; filter is defined in src/stdlib.lisp, built on apply
(print (filter (lambda (x) (> x 2)) (list 1 2 3 4 5)))
(print (filter (lambda (x) (> x 100)) (list 1 2 3)))
