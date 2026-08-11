; map is defined in src/stdlib.lisp, built on apply
(print (map (lambda (x) (* x x)) (list 1 2 3 4)))
(print (map (lambda (x) (1+ x)) (list 1 2 3)))
(print (map (lambda (x) (+ x 1)) (list)))
