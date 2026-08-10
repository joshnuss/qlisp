(print 42)
;; Console output: 42
;; Returns: { type: 'number', value: 42 }

(print "Hello, World!")
;; Console output: "Hello, World!"
;; Returns: { type: 'string', value: 'Hello, World!' }

(defun square (x) (* x x))
(print (square 5))
;; Console output: 25
;; Returns: { type: 'number', value: 25 }
